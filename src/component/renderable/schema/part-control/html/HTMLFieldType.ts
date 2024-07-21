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
    this.modalElement.addEventListener("click", () => this.onClose());
    this.owner.element.appendChild(this.modalElement);
    this.valueInput = this.element.querySelector("[data-bc-text-input");
    this.owner.element
      .querySelector("[data-bc-btn-close]")
      .addEventListener("click", () => {
        this.onClose();
      });
    this.element.addEventListener("click", (e) => {
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
      } catch { }
      if (data) {
        if (Object.keys(data).find((e) => e == "isLoaded")) {
          if (data.isLoaded) {
            iframe.style.display = "block";
            loading.style.display = "none";
            var doc = iframe.contentDocument || iframe.contentWindow.document;

            var height =
              doc.documentElement.scrollHeight || doc.body.offsetHeight;
            var width = doc.documentElement.scrollWidth || doc.body.offsetWidth;
            iframe.style.height = `${Math.min(
              Number(this.owner.options.maxHeight || 300),
              Math.max(Number(this.owner.options.minHeight || 300), height)
            )}px`;
            iframe.style.width = `${Math.min(
              Number(this.owner.options.maxWidth || 450),
              Math.max(Number(this.owner.options.minWidth || 450), width)
            )}px`;
          } else {
            this.onClose();
            window.removeEventListener("message", onEventReceived);
          }
        }
        if (Object.keys(data).find((i) => i == "isSubmited")) {
          delete data["isSubmited"];
          if (Object.keys(data).length > 0) {
            this.value = data;
            this.owner.owner.updateButtonsState();
          }
          this.onClose();
          window.removeEventListener("message", onEventReceived);
        }
      }
    };
    window.addEventListener("message", onEventReceived);
    iframe.src = this.part.link;
    iframe.style.display = "none";
    iframe.onload = (e) => {
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

    if (this.answer && Object.keys(this.value).length == 0) {
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
