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
  private valueInput: HTMLInputElement;
  private value: IUserActionPart;
  private popupElement: HTMLElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.popupElement = Util.parse(popupLayout).querySelector(
      "[data-bc-popup-container]"
    );
    this.owner.button.setAttribute("data-bc-btn", "");
    this.owner.button.setAttribute("data-sys-plus", "");
    this.owner.button.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-plus-icon="" d="M8.4 0H5.6V5.6H0V8.4H5.6V14H8.4V8.4H14V5.6H8.4V0Z" fill="#004B85"/></svg>`;
    this.owner.element.appendChild(this.popupElement);
    this.valueInput = this.element.querySelector("[data-bc-text-input");
    document
      .querySelector("[data-bc-btn-close]")
      .addEventListener("click", () => {
        this.onClose();
      });
    this.owner.button.addEventListener("click", (e) => {
      e.preventDefault();
      this.onButtonClick();
    });

    this.loadFromServerAsync();
  }
  protected onButtonClick() {
    this.popupElement.style.display = "block";
  }
  protected async loadFromServerAsync(): Promise<void> {
    const result = await Util.fetchDataAsync<popupResponse>(
      this.part.link,
      "POST",
      this.value
    );
    this.fillUI(result.body);
  }
  protected fillUI(html: string) {
    const body = this.popupElement.querySelector("[data-bc-body]");
    const iframe = document.createElement("iframe");
    iframe.src = "data:text/html," + encodeURIComponent(html);
    body.append(iframe);
    window.addEventListener("message", (e) => {
      if (
        e.origin != window.location.origin &&
        this.popupElement.style.display == "block"
      ) {
        this.value = JSON.parse(e.data);
        this.onClose();
      }
    });
  }
  protected setInputValue(): void {
    // const value = {};

    // const form: any = this.popupElement.querySelector(
    //   `#${this.part.formIdContent}`
    // );
    // if (form.onsubmit == null) {
    //   const data = new FormData(form);
    //   for (const [name, v] of data) {
    //     if (v) {
    //       value[name] = v;
    //     }
    //   }
    // } else {
    //   const data = form.onsubmit();
    //   data.map((e) => {
    //     value[e.key] = e.value;
    //   });
    // }
    this.valueInput.value = JSON.stringify(this.value) || "";
  }

  public onClose(): void {
    this.popupElement.style.display = "none";
    this.setInputValue();
  }
  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer) {
      if (this.value) {
        retVal = {
          part: this.part.part,
          values: [
            {
              value: this.value || "",
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }
  public getValidationErrorsAsync(): Promise<IValidationError> {
    return null;
  }
  public getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const changed = this.value != this.answer.values[0].value;
      if (changed) {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: this.value,
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;

    if (this.answer) {
      const changed = this.value != this.answer.values[0].value;
      if (changed) {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: this.value,
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
