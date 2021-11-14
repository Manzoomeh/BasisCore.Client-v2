import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import SourceBaseComponent from "../../SourceBaseComponent";
import IFormMakerOptions from "./IFormMakerOptions";
import IQuestionSchema, { IAnswerSchema } from "./ISchema";
import QuestionCollection from "./question-container/QuestionContainer";

declare const $bc: IBCUtil;

@injectable()
export default class SchemaComponent extends SourceBaseComponent {
  private _questions: Array<QuestionCollection>;

  private urlToken: IToken<string>;
  private schemaIdToken: IToken<string>;
  private versionToken: IToken<string>;
  private viewModeToken: IToken<string>;

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
      const schema = await Util.getDataAsync<IQuestionSchema>(url);

      this._questions = new Array<QuestionCollection>();
      schema.questions.forEach((question) => {
        const partAnswer = answer?.properties.find(
          (x) => x.prpId == question.prpId
        );
        this._questions.push(
          new QuestionCollection(question, options, container, partAnswer)
        );
      });
    } else {
      throw Error("can't detect 'schemaId'");
    }
  }
}
