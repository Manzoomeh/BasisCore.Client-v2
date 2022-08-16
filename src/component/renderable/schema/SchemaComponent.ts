import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import { IServerResponse } from "../../../type-alias";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import IAnswerSchema from "./IAnswerSchema";
import IFormMakerOptions, {
  DisplayMode,
  GetSchemaCallbackAsync,
} from "./IFormMakerOptions";
import IQuestionCellManager from "./IQuestionCellManager";
import IQuestionSchema from "./IQuestionSchema";
import IUserActionResult from "./IUserActionResult";
import QuestionCollection from "./question-container/QuestionContainer";
import QuestionCellManager from "./QuestionCellManager";
import Section from "./section/Section";

@injectable()
export default class SchemaComponent extends SourceBaseComponent {
  private _questions: Array<QuestionCollection>;
  private readonly _dc: DependencyContainer;

  private schemaUrlToken: IToken<string>;
  //private schemaIdToken: IToken<string>;
  //private versionToken: IToken<string>;
  //private viewModeToken: IToken<string>;
  private paramUrlToken: IToken<string>;
  private displayModeToken: IToken<string>;
  private buttonSelector: string;
  private resultSourceIdToken: IToken<string>;
  private callbackToken: IToken<string>;
  private schemaCallbackToken: IToken<string>;
  //private lidToken: IToken<string>;
  private cellToken: IToken<string>;
  private _currentCellManager: IQuestionCellManager;
  private getAnswersAndSetAsSource: () => void;
  private _schema: IQuestionSchema;
  private _answer: IAnswerSchema;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context);
    this._dc = container;
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.schemaUrlToken = this.getAttributeToken("schemaUrl");
    this.paramUrlToken = this.getAttributeToken("paramUrl");
    //this.schemaIdToken = this.getAttributeToken("id");
    //this.versionToken = this.getAttributeToken("version");
    //this.viewModeToken = this.getAttributeToken("viewMode");
    this.displayModeToken = this.getAttributeToken("displayMode");

    this.buttonSelector = await this.getAttributeValueAsync("button");
    this.resultSourceIdToken = this.getAttributeToken("resultSourceId");
    this.callbackToken = this.getAttributeToken("callback");
    this.schemaCallbackToken = this.getAttributeToken("schemaCallback");
    //this.lidToken = this.getAttributeToken("lid");
    this.cellToken = this.getAttributeToken("cell");
    document
      .querySelectorAll(this.buttonSelector)
      .forEach((btn) => btn.addEventListener("click", this.onClick.bind(this)));
  }

  private onClick(e: MouseEvent) {
    e.preventDefault();
    if (this.getAnswersAndSetAsSource) {
      this.getAnswersAndSetAsSource();
    }
  }

  public async runAsync(source?: ISource): Promise<any> {
    //const schemaId = await this.schemaIdToken?.getValueAsync();
    const displayMode = ((await this.displayModeToken?.getValueAsync()) ??
      "new") as DisplayMode;
    if (displayMode != "new") {
      super.runAsync(source);
    } else {
      await this.initUIAsync(null);
    }
  }

  protected async renderSourceAsync(dataSource: ISource): Promise<any> {
    await this.initUIAsync(dataSource.rows[0]);
  }

  public async initUIAsync(answer?: IAnswerSchema): Promise<void> {
    this._answer = answer;
    this._currentCellManager = null;
    //schemaId = this._answer?.schemaId ?? schemaId;
    this._questions = new Array<QuestionCollection>();
    this.getAnswersAndSetAsSource = null;
    const container = document.createElement("div") as Element;
    container.setAttribute("data-bc-schema-main-container", "");

    this.setContent(container, false);
    //if (schemaId) {
    const resultSourceId = await this.resultSourceIdToken?.getValueAsync();
    //const viewModeStr = await this.viewModeToken?.getValueAsync();
    const displayMode = ((await this.displayModeToken?.getValueAsync()) ??
      "new") as DisplayMode;
    const schemaUrlStr = await this.schemaUrlToken?.getValueAsync();
    const paramUrlStr = await this.paramUrlToken?.getValueAsync();
    //const version = await this.versionToken?.getValueAsync();
    const callback = await this.callbackToken?.getValueAsync();
    const schemaCallbackStr = await this.schemaCallbackToken?.getValueAsync();
    //const lidStr = await this.lidToken?.getValueAsync();
    //const lid = lidStr ? parseInt(lidStr) : null;
    const cellStr = await this.cellToken?.getValueAsync();
    const cell = cellStr ? parseInt(cellStr) : 1;
    var schemaCallback: GetSchemaCallbackAsync = schemaCallbackStr
      ? eval(schemaCallbackStr)
      : null;

    if (!schemaCallback) {
      schemaCallback = async (context, schemaUrl) => {
        // const url = Util.formatUrl(schemaUrlStr, null, {
        //   ...(id && { id }),
        //   ...(ver && { ver }),
        //   ...(lid && { lid }),
        // });
        const url =
          (schemaUrl?.length ?? 0) > 0
            ? `${schemaUrlStr}${schemaUrl}`
            : schemaUrlStr;
        const response = await Util.getDataAsync<
          IServerResponse<IQuestionSchema>
        >(url);
        return response.sources[0].data[0];
      };
    }
    //const viewMode = this._answer ? (viewModeStr ?? "true") == "true" : false;
    let data = {};
    Array.from(this.node.attributes)
      .filter((x) => x.name.startsWith("qs_"))
      .map((x) => (data[x.name.substring(3)] = x.value));
    const options: IFormMakerOptions = {
      displayMode: displayMode,
      paramUrl: paramUrlStr ?? this._answer?.paramUrl,
      schemaId: this._answer?.schemaId,
      lid: this._answer?.lid,
      version: this._answer?.schemaVersion,
      callback: callback ? eval(callback) : null,
      dc: this._dc,
      subSchemaOptions: {
        schemaUrl: schemaUrlStr,
        callback: callback,
        cell: cellStr,
        schemaCallback: schemaCallbackStr,
        displayMode: displayMode,
      },
      queryStrings: data,
    };

    this._schema = await schemaCallback(this.context, options.paramUrl);
    const sections = new Map<number, Section>();
    if (this._schema && this._schema.questions?.length > 0) {
      this._schema.questions.forEach((question) => {
        const partAnswer = this._answer?.properties.find(
          (x) => x.prpId == question.prpId
        );
        let cellManager: IQuestionCellManager = null;
        if (question.sectionId && this._schema.sections?.length > 0) {
          if (sections.has(question.sectionId)) {
            cellManager = sections.get(question.sectionId).cellManager;
          } else {
            const sectionSchema = this._schema.sections.find(
              (x) => x.id == question.sectionId
            );
            if (sectionSchema) {
              const section = new Section(sectionSchema, container, cell);
              sections.set(sectionSchema.id, section);
              cellManager = section.cellManager;
              this._currentCellManager = null;
            }
          }
        }
        if (!cellManager) {
          if (!this._currentCellManager) {
            this._currentCellManager = new QuestionCellManager(container, cell);
          }
          cellManager = this._currentCellManager;
        }
        if (options.displayMode == "view") {
          if (partAnswer && partAnswer != undefined) {
            this._questions.push(
              new QuestionCollection(question, options, cellManager, partAnswer)
            );
          }
        } else {
          this._questions.push(
            new QuestionCollection(question, options, cellManager, partAnswer)
          );
        }
      });
      if (
        this.buttonSelector &&
        resultSourceId &&
        options.displayMode != "view"
      ) {
        this.getAnswersAndSetAsSource = async () => {
          const answer = await this.getAnswersAsync(false);
          if (answer) {
            this.context.setAsSource(resultSourceId, answer);
          }
        };
      }
    }
    //}
  }
  public async getAnswersAsync(
    throwError: boolean
  ): Promise<IUserActionResult> {
    const userActionList = new Array<any>();
    let hasValidationError = false;
    let retVal: IUserActionResult = null;
    for (const question of this._questions) {
      try {
        var actions = await question.getUserActionAsync();
        if (actions) {
          userActionList.push(actions);
        }
      } catch (e) {
        hasValidationError = true;
      }
    }

    // this._questions.forEach((question) => {
    //   try {
    //     var actions = question.getUserActionAsync();
    //     if (actions) {
    //       userActionList.push(actions);
    //     }
    //   } catch (e) {
    //     hasValidationError = true;
    //   }
    // });
    if (hasValidationError && throwError) {
      throw Error("invalid");
    }
    if (!hasValidationError && userActionList.length > 0) {
      retVal = {
        lid: this._schema.lid,
        paramUrl: this._schema.paramUrl,
        schemaId: this._schema.schemaId,
        schemaVersion: this._schema.schemaVersion,
        usedForId: this._answer?.usedForId,
        properties: userActionList,
      };
    }
    return retVal;
  }
}
