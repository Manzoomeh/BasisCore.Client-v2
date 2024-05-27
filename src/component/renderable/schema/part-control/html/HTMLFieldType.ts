import { IPartCollection } from "../../IAnswerSchema";
import Question from "../../question/Question";
import layout from "./assets/layout.html";
import HTMLLayout from "./assets/HTMLLayout.html";
import Util from "../../../../../Util";
import QuestionPart from "../../question-part/QuestionPart";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import "./assets/style";
import { IQuestionPart } from "../../IQuestionSchema";

export default class HTMLFieldType extends QuestionPart {
  private valueInput: HTMLInputElement;
  private value: IUserActionPart;
  private modalElement: HTMLElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.modalElement = Util.parse(HTMLLayout).querySelector(
      "[data-bc-html-container]"
    );
    this.owner.button.setAttribute("data-bc-btn", "");
    this.owner.button.setAttribute("data-sys-plus", "");
    this.owner.button.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-plus-icon="" d="M8.4 0H5.6V5.6H0V8.4H5.6V14H8.4V8.4H14V5.6H8.4V0Z" fill="#004B85"/></svg>`;
    this.owner.element.appendChild(this.modalElement);
    this.valueInput = this.element.querySelector("[data-bc-text-input");
    this.owner.element
      .querySelector("[data-bc-btn-close]")
      .addEventListener("click", () => {
        this.onClose();
      });
    this.owner.button.addEventListener("click", (e) => {
      e.preventDefault();
      this.onButtonClick();
    });
    if (answer) {
      this.valueInput.value = JSON.stringify(answer.values[0].value);
      this.value = answer.values[0].value;
    }
  }
  protected onButtonClick() {
    this.modalElement.style.display = "block";
    this.fillUI();
  }

  protected fillUI() {
    const body = this.modalElement.querySelector("[data-bc-body]");
    body.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-bc-iframe", "");
    const loading = document.createElement("div");
    loading.innerText = "loading ...";
    const onEventReceived = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {}
      if (data) {
        if (Object.keys(data).find((e) => e == "isLoaded")) {
          if (data.isLoaded) {
            iframe.style.display = "block";
            loading.style.display = "none";
          } else {
            this.onClose();
            window.removeEventListener("message", onEventReceived);
          }
        }
        if (Object.keys(data).find((i) => i == "isSubmited")) {
          delete data["isSubmited"];
          this.value = data;
          this.onClose();
          window.removeEventListener("message", onEventReceived);
        }
      }
    };
    window.addEventListener("message", onEventReceived);
    iframe.src = this.part.link;
    iframe.style.display = "none";
    iframe.onload = () => {
      if (this.value) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ ...this.value, mode: "edit" })
        );
      } else {
        iframe.contentWindow.postMessage(JSON.stringify({ mode: "new" }));
      }
    };
    body.append(iframe);
    body.append(loading);
  }
  protected setInputValue(): void {
    this.valueInput.value = JSON.stringify(this.value) || "";
  }

  public onClose(): void {
    this.modalElement.style.display = "none";
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
