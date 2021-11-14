import { inject, injectable } from "tsyringe";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import { IServerResponse } from "../../../type-alias";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import SourceBaseComponent from "../../SourceBaseComponent";
import IFormMakerOptions from "./IFormMakerOptions";
import IQuestionSchema, { IAnswerSchema } from "./ISchema";
import { IUserActionResult } from "./IUserActionResult";
import QuestionCollection from "./question-container/QuestionContainer";

declare const $bc: IBCUtil;

@injectable()
export default class SchemaComponent extends SourceBaseComponent {
  private _questions: Array<QuestionCollection>;

  private urlToken: IToken<string>;
  private schemaIdToken: IToken<string>;
  private versionToken: IToken<string>;
  private viewModeToken: IToken<string>;
  private buttonToken: IToken<string>;
  private resultSourceIdToken: IToken<string>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.urlToken = this.getAttributeToken("schemaUrl");
    this.schemaIdToken = this.getAttributeToken("id");
    this.versionToken = this.getAttributeToken("version");
    this.viewModeToken = this.getAttributeToken("viewMode");
    this.buttonToken = this.getAttributeToken("button");
    this.resultSourceIdToken = this.getAttributeToken("resultSourceId");
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
    const buttonSelector = await this.buttonToken?.getValueAsync();
    const resultSourceId = await this.resultSourceIdToken?.getValueAsync();
    const viewModeStr = await this.viewModeToken?.getValueAsync();
    const urlStr = await this.urlToken?.getValueAsync();
    const version = await this.versionToken?.getValueAsync();

    const options: IFormMakerOptions = {
      viewMode: answer ? (viewModeStr ?? "true") == "true" : false,
      schemaId: answer?.schemaId ?? schemaId,
      url: urlStr,
      version: answer?.schemaVersion ?? version,
    };

    if (options.schemaId) {
      const url = Util.formatUrl(options.url, null, {
        id: options.schemaId,
        ver: options.version,
      });
      const response = await Util.getDataAsync<
        IServerResponse<IQuestionSchema>
      >(url);
      const schema = response.sources[0].data[0];

      this._questions = new Array<QuestionCollection>();
      schema.questions.forEach((question) => {
        const partAnswer = answer?.properties.find(
          (x) => x.prpId == question.prpId
        );
        this._questions.push(
          new QuestionCollection(question, options, container, partAnswer)
        );
      });
      if (buttonSelector && resultSourceId) {
        const getAnswers = (e: MouseEvent) => {
          e.preventDefault();
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
        document
          .querySelectorAll(buttonSelector)
          .forEach((btn) =>
            btn.addEventListener("click", getAnswers.bind(this))
          );
      }
    } else {
      throw Error("can't detect 'schemaId'");
    }
  }
}
