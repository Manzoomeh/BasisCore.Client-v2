import Question from "../question/Question";
import IFormMakerOptions from "../IFormMakerOptions";
import layout from "./assets/layout.html";
import "./assets/style";
import Util from "../../../../Util";
import { IUserActionProperty, IAnswerValues } from "../IUserActionResult";
import { IAnswerProperty, IAnswerPart } from "../IAnswerSchema";
import { IQuestion } from "../IQuestionSchema";
import IQuestionCellManager from "../IQuestionCellManager";
import QuestionPart from "../question-part/QuestionPart";
import ValidationHandler from "../../../ValidationHandler";

export default class QuestionContainer {
  public validationHandler : ValidationHandler;
  public readonly QuestionSchema: IQuestion;
  protected readonly element: Element;
  private readonly _questions: Array<Question> = new Array<Question>();
  public readonly options: IFormMakerOptions;
  public readonly answer: IAnswerProperty;
  private _removedQuestions: Array<number>;
  public AllQuestions: Array<QuestionContainer>;

  constructor(
    all: Array<QuestionContainer>,
    questionSchema: IQuestion,
    options: IFormMakerOptions,
    cellManager: IQuestionCellManager,
    answer: IAnswerProperty,
    config : { validationErrors: NodeJS.Dict<string>; messagesApi: string },
    lid  : number
  ) {
    this.validationHandler = new ValidationHandler(lid,config)
    this.AllQuestions = all;
    this.QuestionSchema = questionSchema;
    this.options = options;
    this.answer = answer;
    const copyTemplate = layout
      .replace("@title", this.QuestionSchema.title)
      .replace("@prpid", this.QuestionSchema.prpId?.toString());
    const uiElement =
      Util.parse(copyTemplate).querySelector<HTMLDivElement>(
        "[data-bc-question]"
      );
    this.element = uiElement.querySelector("[data-bc-answer-collection]");
    if (!questionSchema.help) {
      uiElement.querySelector("[data-bc-help-btn]").remove();
    } else {
      uiElement.querySelector("[data-bc-help-btn]").setAttribute("data-bc-help-tooltip", questionSchema.help);
    }
    const headerContainer = uiElement.querySelector(
      "[data-bc-answer-title-container]"
    );
    if (questionSchema.cssClass) {
      uiElement.classList.add(questionSchema.cssClass);
    }
    if (questionSchema.parts.length > 1) {
      const template = document.createElement("div");
      template.setAttribute("data-bc-answer-title", "");
      template.setAttribute("data-bc-part-related-cell", "");
      template.setAttribute("data-sys-text", "");
      questionSchema.parts.forEach((part) => {
        const cpy = template.cloneNode();
        cpy.appendChild(document.createTextNode(part.caption ?? ""));
        headerContainer.appendChild(cpy);
      });
    } else {
      headerContainer.remove();
    }

    cellManager.add(uiElement);
    if (answer) {
      this.answer.answers.forEach((answer) => this.addQuestion(answer));
    } else {
      this.addQuestion(null);
    }

    const tempLog = uiElement.querySelector("[data-bc-answer-container]");

    tempLog.setAttribute(
      "data-bc-schema-info-multi",
      questionSchema.multi ? "1" : "0"
    );

    if (questionSchema.typeId) {
      tempLog.setAttribute(
        "data-bc-schema-info-type",
        questionSchema.typeId.toString()
      );
    }

    if (questionSchema.wordId) {
      tempLog.setAttribute(
        "data-bc-schema-info-word",
        questionSchema.wordId.toString()
      );
    }

    tempLog.setAttribute(
      "data-bc-schema-info-part",
      questionSchema.parts ? questionSchema.parts.length.toString() : "0"
    );

    questionSchema.parts.forEach((part, index) =>
      tempLog.setAttribute(
        `data-bc-schema-info-part-${index}-type`,
        part.viewType
      )
    );
  }

  public addQuestion(answer?: IAnswerPart): Question {
    const question = new Question(
      this.QuestionSchema,
      this.options,
      this,
      this.element,
      answer
    );
    this._questions.push(question);
    this.updateButtonsState();
    return question;
  }

  public updateButtonsState() {
    const lastIndex = this._questions.length - 1;
    this._questions.forEach((x, i) => x.updateButtonState(i == lastIndex));
  }

  public onQuestionRemove(question: Question) {
    const index = this._questions.indexOf(question);
    this._questions.splice(index, 1);
    if (question.answer?.id) {
      if (!this._removedQuestions) {
        this._removedQuestions = [];
      }
      this._removedQuestions.push(question.answer.id);
    }
  }

  public async getAllValuesAsync(): Promise<IAnswerValues> {
    const values = await Promise.all(
      this._questions.map((x) => x.getAllValuesAsync())
    );
    return {
      propId: this.QuestionSchema.prpId,
      multi: this.QuestionSchema.multi,
      values: values,
    };
  }

  public async getChangeValuesAsync(): Promise<IUserActionProperty> {
    let userAction: IUserActionProperty = null;

    const added = (
      await Promise.all(this._questions.map((x) => x.getAddedPartsAsync()))
    ).filter((x) => x);
    const edited = (
      await Promise.all(this._questions.map((x) => x.getEditedPartsAsync()))
    ).filter((x) => x);
    const deleted = (
      await Promise.all(
        this._questions.map(async (x) => {
          return { x, userAction: await x.getDeletedPartsAsync() };
        })
      )
    )
      .filter((x) => x.userAction)
      .map((x) => {
        const deletedValues = x.userAction.parts.reduce(
          (sum, item) => sum + item.values.length,
          0
        );
        const allValues = x.x.answer.parts.reduce(
          (sum, item) => sum + item.values.length,
          0
        );
        return x.userAction.parts.length === this.QuestionSchema.parts.length &&
          edited.length === 0 &&
          added.length === 0 &&
          allValues === deletedValues
          ? { id: x.userAction.id }
          : x.userAction;
      });
    this._removedQuestions?.forEach((x) => {
      deleted.push({
        id: x,
      });
    });

    if (added.length > 0 || edited.length > 0 || deleted.length > 0) {
      userAction = {
        propId: this.QuestionSchema.prpId,
        multi: this.QuestionSchema.multi,
        ...(added.length > 0 && { added: added }),
        ...(edited.length > 0 && { edited: edited }),
        ...(deleted.length > 0 && { deleted: deleted }),
      };
    }

    return userAction;
  }

  public async getUserActionAsync(): Promise<IUserActionProperty> {
    let userAction: IUserActionProperty = null;
    const errors = (
      await Promise.all(
        this._questions.map((x) => x.getValidationErrorsAsync())
      )
    ).filter((x) => x);

    if (errors.length === 0) {
      userAction = await this.getChangeValuesAsync();
    } else {
      throw Error("invalid");
    }
    return userAction;
  }

  public getParts(part: number): QuestionPart[] {
    return this._questions
      .flatMap((x) => x._parts)
      .filter((x) => x.part.part === part);
  }
}
