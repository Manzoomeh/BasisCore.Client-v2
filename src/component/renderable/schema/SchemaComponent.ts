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
import Section from "./section/Section";

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
  private lidToken: IToken<string>;
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
    this.lidToken = this.getAttributeToken("lid");
    document
      .querySelectorAll(this.buttonSelector)
      .forEach((btn) => btn.addEventListener("click", this.onClick.bind(this)));
  }

  private onClick(e: MouseEvent) {
    e.preventDefault();
    if (this.getAnswers) {
      this.getAnswers();
    }
  }

  public async runAsync(source?: ISource): Promise<any> {
    const schemaId = await this.schemaIdToken?.getValueAsync();
    if (!schemaId) {
      super.runAsync(source);
    } else {
      await this.initUIAsync(null, schemaId);
    }
  }

  protected async renderSourceAsync(dataSource: ISource): Promise<any> {
    await this.initUIAsync(dataSource.rows[0]);
  }

  public async initUIAsync(
    answer?: IAnswerSchema,
    schemaId?: string
  ): Promise<void> {
    schemaId = answer?.schemaId ?? schemaId;
    this._questions = new Array<QuestionCollection>();
    this.getAnswers = null;
    const container = document.createElement("div") as Element;
    this.setContent(container, false);
    if (schemaId) {
      const resultSourceId = await this.resultSourceIdToken?.getValueAsync();
      const viewModeStr = await this.viewModeToken?.getValueAsync();
      const schemaUrlStr = await this.schemaUrlToken?.getValueAsync();
      const version = await this.versionToken?.getValueAsync();
      const callback = await this.callbackToken?.getValueAsync();
      const schemaCallbackStr = await this.schemaCallbackToken?.getValueAsync();
      const lidStr = await this.lidToken?.getValueAsync();
      const lid = lidStr ? parseInt(lidStr) : null;
      var schemaCallback: GetSchemaCallbackAsync = schemaCallbackStr
        ? eval(schemaCallbackStr)
        : null;

      if (!schemaCallback) {
        schemaCallback = async (context, id, ver, lid) => {
          const url = Util.formatUrl(schemaUrlStr, null, {
            ...(id && { id }),
            ...(ver && { ver }),
            ...(lid && { lid }),
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
        lid: lid,
        version: answer?.schemaVersion ?? version,
        callback: viewMode && callback ? eval(callback) : null,
      };

      const schema = await schemaCallback(
        this.context,
        options.schemaId,
        options.version,
        options.lid
      );
      const sections = new Map<number, Section>();
      if (schema && schema.questions?.length > 0) {
        schema.questions.forEach((question) => {
          const partAnswer = answer?.properties.find(
            (x) => x.prpId == question.prpId
          );
          let questionContainer = container;
          if (question.sectionId && schema.sections?.length > 0) {
            if (sections.has(question.sectionId)) {
              questionContainer = sections.get(question.sectionId).element;
            } else {
              const sectionSchema = schema.sections.find(
                (x) => x.id == question.sectionId
              );
              if (sectionSchema) {
                const section = new Section(sectionSchema, container);
                sections.set(sectionSchema.id, section);
                questionContainer = section.element;
              }
            }
          }
          this._questions.push(
            new QuestionCollection(
              question,
              options,
              questionContainer,
              partAnswer
            )
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
      }
    }
  }
}
