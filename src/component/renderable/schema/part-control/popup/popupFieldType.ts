import IAnswerSchema, { IPartCollection } from "../../IAnswerSchema";
import Question from "../../question/Question";
import layout from "./assets/layout.html";
import popupLayout from "./assets/popupLayout.html";
import Util from "../../../../../Util";
import QuestionPart from "../../question-part/QuestionPart";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import "./assets/style";
import { IQuestionPart } from "../../IQuestionSchema";
type popupResponse = {
  body: string;
};
export default class PopupFieldType extends QuestionPart {
  public getValidationErrorsAsync(): Promise<IValidationError> {
    return null;
  }
  private button: Element;
  private value: IUserActionPart;
  private popupElement: Element;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.popupElement = Util.parse(popupLayout).querySelector(
      "[data-bc-popup-container]"
    );
    this.owner.element.appendChild(this.popupElement);

    this.button = this.element.querySelector("[data-sys-plus]");
    this.button.addEventListener("click", () => this.onButtonClick());
    this.popupElement
      .querySelector("[data-bc-submit-button]")
      .addEventListener("click", () => {
        this.onSubmit();
      });
    this.loadFromServerAsync();
  }
  protected onButtonClick() {
    this.popupElement.setAttribute("style", "display:block");
  }
  protected fillUI(html: string) {
    this.popupElement.querySelector("[data-bc-body]").innerHTML = html;
  }

  protected async loadFromServerAsync(): Promise<void> {
    const result = await Util.getDataAsync<popupResponse>(this.part.link);
    this.fillUI(result.body);
  }
  public onSubmit(): void {
    this.popupElement.setAttribute("style", "display:none");
  }
  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer) {
      const elements = document.querySelectorAll(
        this.owner.options.popupQuestionSelector
      );
      const value = [];
      elements.forEach((e) => {
        value.push((e as HTMLInputElement).value);
      });
      retVal = {
        part: this.part.part,
        values: [
          {
            value,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }

  public getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const elements = document.querySelectorAll(
      this.owner.options.popupQuestionSelector
    );
    const currentValues = [];
    elements.forEach((e) => {
      currentValues.push((e as HTMLInputElement).value);
    });
    if (this.answer) {
      const changed = currentValues != this.answer.values[0].value;
      if (changed) {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: currentValues,
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const elements = document.querySelectorAll(
      this.owner.options.popupQuestionSelector
    );
    const currentValues = [];
    elements.forEach((e) => {
      currentValues.push((e as HTMLInputElement).value);
    });
    if (this.answer) {
      const changed = currentValues != this.answer.values[0].value;

      if (changed) {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: currentValues,
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getValuesAsync(): Promise<IUserActionPart> {
    return Promise.resolve(this.value);
  }
}
