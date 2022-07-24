import Question from "../question/Question";
import IFormMakerOptions from "../IFormMakerOptions";
import layout from "./assets/layout.html";
import "./assets/style";
import Util from "../../../../Util";
import { IUserActionProperty } from "../IUserActionResult";
import { IAnswerProperty, IAnswerPart } from "../IAnswerSchema";
import { IQuestion } from "../IQuestionSchema";
import IQuestionCellManager from "../IQuestionCellManager";

export default class QuestionContainer {
  private readonly questionSchema: IQuestion;
  protected readonly element: Element;
  private readonly _questions: Array<Question> = new Array<Question>();
  public readonly options: IFormMakerOptions;
  public readonly answer: IAnswerProperty;
  private _removedQuestions: Array<number>;

  constructor(
    questionSchema: IQuestion,
    options: IFormMakerOptions,
    cellManager: IQuestionCellManager,
    answer: IAnswerProperty
  ) {
    this.questionSchema = questionSchema;
    this.options = options;
    this.answer = answer;
    var copyTemplate = layout.replace("@title", this.questionSchema.title);
    const uiElement =
      Util.parse(copyTemplate).querySelector<HTMLDivElement>(
        "[data-bc-question]"
      );
    this.element = uiElement.querySelector("[data-bc-answer-collection]");
    if (!questionSchema.help) {
      uiElement.querySelector("[data-bc-help-btn]").remove();
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
        // if (part.caption) {
          cpy.appendChild(document.createTextNode(part.caption??""));
          headerContainer.appendChild(cpy);
        // }
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
      this.questionSchema,
      this.options,
      this,
      this.element,
      answer
    );
    this._questions.forEach((x) => x.setRemovable());
    this._questions.push(question);
    return question;
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

  public async getUserActionAsync(): Promise<IUserActionProperty> {
    let userAction: IUserActionProperty = null;
    const errors = (
      await Promise.all(
        this._questions.map((x) => x.getValidationErrorsAsync())
      )
    ).filter((x) => x);

    if (errors.length == 0) {
      const added = (
        await Promise.all(this._questions.map((x) => x.getAddedPartsAsync()))
      ).filter((x) => x);
      const edited = (
        await Promise.all(this._questions.map((x) => x.getEditedPartsAsync()))
      ).filter((x) => x);
      const deleted = (
        await Promise.all(this._questions.map((x) => x.getDeletedPartsAsync()))
      )
        .filter((x) => x)
        .map((x) =>
          x.parts.length == this.questionSchema.parts.length &&
          edited.length == 0 &&
          added.length == 0
            ? { id: x.id }
            : x
        );

      this._removedQuestions?.forEach((x) => {
        deleted.push({
          id: x,
        });
      });

      if (added.length > 0 || edited.length > 0 || deleted.length > 0) {
        userAction = {
          propId: this.questionSchema.prpId,
          multi: this.questionSchema.multi,
          ...(added.length > 0 && { added: added }),
          ...(edited.length > 0 && { edited: edited }),
          ...(deleted.length > 0 && { deleted: deleted }),
        };
      }
    } else {
      throw Error("invalid");
    }
    return userAction;
  }
}
