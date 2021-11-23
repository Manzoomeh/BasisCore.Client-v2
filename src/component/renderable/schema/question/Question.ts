import IFormMakerOptions from "../IFormMakerOptions";
import QuestionPartFactory from "../part-control/QuestionPartFactory";
import QuestionContainer from "../question-container/QuestionContainer";
import layout from "./assets/layout.html";
import "./assets/style.css";
import QuestionPart from "../question-part/QuestionPart";
import Util from "../../../../Util";
import { IQuestion, IAnswerPart } from "../ISchema";
import { IUserActionAnswer } from "../IUserActionResult";

export default class Question {
  readonly question: IQuestion;
  protected readonly container: Element;
  readonly element: Element;
  readonly options: IFormMakerOptions;
  readonly _parts: Array<QuestionPart>;
  readonly button: HTMLButtonElement;
  readonly owner: QuestionContainer;
  readonly answer: IAnswerPart;
  private readonly _ui: HTMLElement;

  private _onAddClick: AddRemoveCallback;
  private readonly _onRemoveClick: AddRemoveCallback;

  constructor(
    question: IQuestion,
    options: IFormMakerOptions,
    owner: QuestionContainer,
    container: Element,
    answer?: IAnswerPart
  ) {
    this.question = question;
    this.container = container;
    this.options = options;
    this.owner = owner;
    this.answer = answer;
    this._ui = Util.parse(layout).querySelector("[data-bc-answer]");
    this.element = this._ui.querySelector("[data-bc-part-container]");
    if (this.question.multi && !this.options.viewMode) {
      this.button = this._ui.querySelector("[data-bc-btn]");
      this.button.setAttribute("data-bc-btn", "add");
      this.button.addEventListener("click", this.onBtnClick.bind(this));
      this._onAddClick = () => {
        this.owner.addQuestion();
        this.setRemovable();
      };
      this._onRemoveClick = () => {
        this.owner.onQuestionRemove(this);
        this._ui.remove();
      };
    } else {
      this._ui.querySelector("[data-bc-btn]").remove();
    }
    container.appendChild(this._ui);

    this._parts = question.parts.map((part) => {
      const value = this.answer?.parts.find((x) => x.part === part.part);
      return QuestionPartFactory.generate(question, part, this, value);
    });
  }

  public setRemovable() {
    this.button?.setAttribute("data-bc-btn", "remove");
  }

  private onBtnClick(e: MouseEvent) {
    e.preventDefault();
    if (this.button.getAttribute("data-bc-btn") === "add") {
      this._onAddClick();
    } else {
      this._onRemoveClick();
    }
  }

  public replaceAddClick(onClick: AddRemoveCallback) {
    this._onAddClick = onClick;
  }

  public getAddedParts(): IUserActionAnswer {
    const userAction = this._parts.map((x) => x.getAdded()).filter((x) => x);
    return userAction.length > 0
      ? {
          parts: userAction,
        }
      : null;
  }

  public getValidationErrors() {
    const validationErrors = this._parts
      .map((x) => x.getValidationErrors())
      .filter((x) => x);
    return validationErrors.length > 0 ? validationErrors : null;
  }

  public getEditedParts(): IUserActionAnswer {
    const userAction = this._parts.map((x) => x.getEdited()).filter((x) => x);
    return userAction.length > 0
      ? {
          id: this.answer.id,
          parts: userAction,
        }
      : null;
  }

  public getDeletedParts(): IUserActionAnswer {
    const userAction = this._parts.map((x) => x.getDeleted()).filter((x) => x);
    return userAction.length > 0
      ? {
          id: this.answer.id,
          parts: userAction,
        }
      : null;
  }

  public getUserEditAction(): IUserActionAnswer {
    return null;
  }
}

declare type AddRemoveCallback = () => void;
