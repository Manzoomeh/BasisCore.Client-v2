import IFormMakerOptions from "../IFormMakerOptions";
import QuestionPartFactory from "../part-control/QuestionPartFactory";
import QuestionContainer from "../question-container/QuestionContainer";
import layout from "./assets/layout.html";
import "./assets/style.css";
import QuestionPart from "../question-part/QuestionPart";
import Util from "../../../../Util";
import { IUserActionAnswer } from "../IUserActionResult";
import { IAnswerPart } from "../IAnswerSchema";
import { IQuestion } from "../IQuestionSchema";
import IValidationError from "../IValidationError";

export default class Question {
  readonly question: IQuestion;
  protected readonly container: Element;
  readonly element: Element;
  readonly options: IFormMakerOptions;
  readonly _parts: Array<QuestionPart>;
  readonly button: HTMLButtonElement;
  private _removeButton: HTMLButtonElement;
  private _addButton: HTMLButtonElement;
  private _pairBtnContainer: HTMLDivElement;
  readonly owner: QuestionContainer;
  readonly answer: IAnswerPart;
  private readonly _ui: HTMLElement;
  public onAddBtnClick: (e: Event) => void;
  private _onAddClick: AddRemoveCallback;
  private _onRemoveClick: AddRemoveCallback;

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
    this.button = this._ui.querySelector("[data-bc-btn]");
    this._removeButton = this._ui.querySelector("[data-bc-btn-remove]");
    this._addButton = this._ui.querySelector("[data-bc-btn-add]");
    this._pairBtnContainer = this._ui.querySelector(
      "[data-bc-pair-btn-container]"
    );
    this.button.addEventListener("click", this.onBtnClick.bind(this));

    this._removeButton.addEventListener("click", (e) => {
      e.preventDefault;
      this.owner.onQuestionRemove(this);
      this._ui.remove();
      this.owner.addQuestion(null);
    });
    this._addButton.addEventListener("click", this.onAddBtnClick);
    this._onAddClick = () => {
      this.owner.addQuestion(null);
    };
    this._onRemoveClick = () => {
      this.owner.onQuestionRemove(this);
      this._ui.remove();
    };

    if (
      (this.question.multi &&
        this.options.displayMode != "view" &&
        !this.question.disabled) ||
      this.question.parts[0].viewType == "html"
    ) {
      this.button.setAttribute("data-bc-btn", "add");
      this.button.setAttribute("data-sys-plus", "");
      this.button.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-plus-icon="" d="M8.4 0H5.6V5.6H0V8.4H5.6V14H8.4V8.4H14V5.6H8.4V0Z" fill="#004B85"/></svg>`;
    } else {
      this._pairBtnContainer.remove();
      this.button.remove();
    }
    container.appendChild(this._ui);
    this._parts = question.parts.map((part) => {
      const value = this.answer?.parts.find((x) => x.part === part.part);
      return QuestionPartFactory.generate(question, part, this, value);
    });
  }

  public updateButtonState(isLastQuestion: boolean) {
    const disabled = this.question.parts.some((x) => x.disabled);
    if (isLastQuestion) {
      if (disabled || !this.answer) {
        this.button.setAttribute("data-bc-btn", "add");
        this.button.setAttribute("data-sys-plus", "");
        this.button.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-plus-icon="" d="M8.4 0H5.6V5.6H0V8.4H5.6V14H8.4V8.4H14V5.6H8.4V0Z" fill="#004B85"/></svg>`;
        this._pairBtnContainer.style.display = "none";
        this.button.style.display = "flex";
      } else {
        this._pairBtnContainer.style.display = "block";
        this.button.style.display = "none";
      }
    } else {
      if (this.answer && disabled) {
        this._pairBtnContainer.style.display = "none";
        this.button.style.display = "none";
      } else {
        this.button.setAttribute("data-bc-btn", "remove");
        this.button.setAttribute("data-sys-minus", "");
        this.button.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-minus-icon="" d="M2.04028 0.0603034L0.0603845 2.0402L4.02018 6L0.0603845 9.9598L2.04028 11.9397L6.00008 7.9799L9.95988 11.9397L11.9398 9.9598L7.97998 6L11.9398 2.0402L9.95988 0.0603037L6.00008 4.0201L2.04028 0.0603034Z" fill="#B40020"></path></svg>`;
        this._pairBtnContainer.style.display = "none";
        this.button.style.display = "flex";
      }
    }
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

  public async getAddedPartsAsync(): Promise<IUserActionAnswer> {
    const userActionTaskList = this._parts.map((x) => x.getAddedAsync());
    const userAction = (await Promise.all(userActionTaskList)).filter((x) => x);
    return userAction.length > 0
      ? {
          ...(this.answer && { id: this.answer.id }),
          parts: userAction,
        }
      : null;
  }

  public async getValidationErrorsAsync(): Promise<IValidationError[]> {
    const validationErrorsTaskList = this._parts.map((x) =>
      x.getValidationErrorsAsync()
    );
    const validationErrors = (
      await Promise.all(validationErrorsTaskList)
    ).filter((x) => x);
    return validationErrors.length > 0 ? validationErrors : null;
  }

  public async getEditedPartsAsync(): Promise<IUserActionAnswer> {
    const userActionTaskList = this._parts.map((x) => x.getEditedAsync());
    const userAction = (await Promise.all(userActionTaskList)).filter((x) => x);
    return userAction.length > 0
      ? {
          id: this.answer.id,
          parts: userAction,
        }
      : null;
  }

  public async getDeletedPartsAsync(): Promise<IUserActionAnswer> {
    const userActionTaskList = this._parts.map((x) => x.getDeletedAsync());
    const userAction = (await Promise.all(userActionTaskList)).filter((x) => x);
    return userAction.length > 0
      ? {
          id: this.answer.id,
          parts: userAction,
        }
      : null;
  }

  public async getAllValuesAsync() {
    const userActionTaskList = this._parts.map((x) => x.getValuesAsync());
    const userAction = (await Promise.all(userActionTaskList)).filter((x) => x);
    return userAction.length > 0
      ? {
          ...(this.answer && { id: this.answer.id }),
          parts: userAction,
        }
      : null;
  }
}

declare type AddRemoveCallback = () => void;
