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
  private button: Element;
  private valueInput: HTMLInputElement;
  private value: IUserActionPart;
  private popupElement: Element;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.popupElement = Util.parse(popupLayout).querySelector(
      "[data-bc-popup-container]"
    );

    this.owner.element.appendChild(this.popupElement);
    const btn = this.popupElement.querySelector("[data-bc-btn-close");
    this.valueInput = this.element.querySelector("[data-bc-text-input");
    btn.addEventListener("click", () => {
      this.onClose();
    });
    this.button = this.element.querySelector("[data-sys-plus]");
    this.button.addEventListener("click", () => this.onButtonClick());
    this.popupElement
      .querySelector("[data-bc-submit-button]")
      .addEventListener("click", () => {
        this.onClose();
        this.setInputValue();
      });
    this.loadFromServerAsync();
  }
  protected onButtonClick() {
    this.popupElement.setAttribute("style", "display:block");
  }
  protected fillUI(html: string) {
    const body = this.popupElement.querySelector("[data-bc-body]");
    body.innerHTML = html;
    const scripts = body.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      eval(scripts[i].innerHTML);
    }
  }
  protected setInputValue(): void {
    const value = {};

    const form: any = this.popupElement.querySelector(
      `#${this.part.formIdContent}`
    );
    if (form.onsubmit == null) {
      const data = new FormData(form);
      for (const [name, v] of data) {
        if (v) {
          value[name] = v;
        }
      }
    } else {
      const data = form.onsubmit();
      data.map((e) => {
        value[e.key] = e.value;
      });
    }
    this.valueInput.value = JSON.stringify(value);
  }
  protected async loadFromServerAsync(): Promise<void> {
    const result = await Util.getDataAsync<popupResponse>(this.part.link);
    this.fillUI(result.body);
  }
  public onClose(): void {
    this.popupElement.setAttribute("style", "display:none");
  }
  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer) {
      const value = {};

      const form: any = this.popupElement.querySelector(
        `#${this.part.formIdContent}`
      );
      if (form.onsubmit == null) {
        const data = new FormData(form);
        for (const [name, v] of data) {
          if (v) {
            value[name] = v;
          }
        }
      } else {
        const data = form.onsubmit();
        data.map((e) => {
          value[e.key] = e.value;
        });
      }
      this.valueInput.value = JSON.stringify(value);
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
  public getValidationErrorsAsync(): Promise<IValidationError> {
    return null;
  }
  public getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;

    const form: any = this.popupElement.querySelector(
      `#${this.part.formIdContent}`
    );

    const currentValues = {};

    for (let i = 0; i < form.elements.length; i++) {
      const element = form.elements[i];

      if (element.name && element.currentValues) {
        currentValues[element.name] = element.currentValues;
      }
    }

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

    const form: any = this.popupElement.querySelector(
      `#${this.part.formIdContent}`
    );

    const currentValues = {};

    for (let i = 0; i < form.elements.length; i++) {
      const element = form.elements[i];

      if (element.name && element.currentValues) {
        currentValues[element.name] = element.currentValues;
      }
    }

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
