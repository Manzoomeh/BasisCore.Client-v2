import { inject, injectable } from "tsyringe";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import { IServerResponse } from "../../../type-alias";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import IAnswerSchema from "./IAnswerSchema";
import IFormMakerOptions, { GetSchemaCallbackAsync } from "./IFormMakerOptions";
import IQuestionSchema from "./IQuestionSchema";
import IUserActionResult from "./IUserActionResult";
import QuestionCollection from "./question-container/QuestionContainer";

@injectable()
export default class SchemaComponent extends SourceBaseComponent {
  private _questions: Array<QuestionCollection>;

  private schemaUrlToken: IToken<string>;
  private schemaIdToken: IToken<string>;
  private versionToken: IToken<string>;
  private viewModeToken: IToken<string>;
  private buttonSelector: string;
  private resultSourceIdToken: IToken<string>;
  private callbackToken: IToken<string>;
  private schemaCallbackToken: IToken<string>;
  private getAnswers: () => void;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.schemaUrlToken = this.getAttributeToken("schemaUrl");
    this.schemaIdToken = this.getAttributeToken("id");
    this.versionToken = this.getAttributeToken("version");
    this.viewModeToken = this.getAttributeToken("viewMode");
    this.buttonSelector = await this.getAttributeValueAsync("button");
    this.resultSourceIdToken = this.getAttributeToken("resultSourceId");
    this.callbackToken = this.getAttributeToken("callback");
    this.schemaCallbackToken = this.getAttributeToken("schemaCallback");
    document
      .querySelectorAll(this.buttonSelector)
      .forEach((btn) => btn.addEventListener("click", this.onClick.bind(this)));
  }

  private onClick(e: MouseEvent) {
    e.preventDefault();
    this.getAnswers();
  }

  public async runAsync(source?: ISource): Promise<any> {
    const schemaId = await this.schemaIdToken?.getValueAsync();
    if (!schemaId) {
      super.runAsync(source);
    } else {
      await this.loadInEditModeAsync(null, schemaId);
    }
  }

  protected async renderSourceAsync(dataSource: ISource): Promise<any> {
    await this.loadInEditModeAsync(dataSource.rows[0]);
  }

  public async loadInEditModeAsync(
    answer?: IAnswerSchema,
    schemaId?: string
  ): Promise<void> {
    const container = document.createElement("div");
    this.setContent(container, false);

    const resultSourceId = await this.resultSourceIdToken?.getValueAsync();
    const viewModeStr = await this.viewModeToken?.getValueAsync();
    const schemaUrlStr = await this.schemaUrlToken?.getValueAsync();
    const version = await this.versionToken?.getValueAsync();
    const callback = await this.callbackToken?.getValueAsync();
    const schemaCallbackStr = await this.schemaCallbackToken?.getValueAsync();

    var schemaCallback: GetSchemaCallbackAsync = schemaCallbackStr
      ? eval(schemaCallbackStr)
      : null;

    if (!schemaCallback) {
      schemaCallback = async (id, ver) => {
        const url = Util.formatUrl(schemaUrlStr, null, {
          id: options.schemaId,
          ver: options.version,
        });
        const response = await Util.getDataAsync<
          IServerResponse<IQuestionSchema>
        >(url);
        return response.sources[0].data[0];
      };
    }
    const viewMode = answer ? (viewModeStr ?? "true") == "true" : false;
    const options: IFormMakerOptions = {
      viewMode: viewMode,
      schemaId: answer?.schemaId ?? schemaId,
      getSchemaCallbackAsync: schemaCallback,
      version: answer?.schemaVersion ?? version,
      callback: viewMode && callback ? eval(callback) : null,
    };

    if (options.schemaId) {
      const schema = await options.getSchemaCallbackAsync(
        options.schemaId,
        options.version
      );

      this._questions = new Array<QuestionCollection>();
      schema.questions.forEach((question) => {
        const partAnswer = answer?.properties.find(
          (x) => x.prpId == question.prpId
        );
        this._questions.push(
          new QuestionCollection(question, options, container, partAnswer)
        );
      });
      if (this.buttonSelector && resultSourceId && !options.viewMode) {
        this.getAnswers = () => {
          const retVal: IUserActionResult = {
            lid: schema.lid,
            schemaId: schema.schemaId,
            schemaVersion: schema.schemaVersion,
            usedForId: answer?.usedForId,
            properties: this._questions
              .map((x) => x.getUserAction())
              .filter((x) => x),
          };
          if (retVal.properties.length > 0) {
            this.context.setAsSource(resultSourceId, retVal);
          }
        };
      }
    } else {
      throw Error("can't detect 'schemaId'");
    }
  }
}
