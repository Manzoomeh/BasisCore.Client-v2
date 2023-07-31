import Util from "../../../../../Util";
import { IPartCollection } from "../../IAnswerSchema";
import { IFixValue, IQuestionPart } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import Question from "../../question/Question";
import layout from "./assets/layout.html";
import "./assets/style";

export default class Lookup extends EditableQuestionPart {
  private _input: HTMLInputElement;
  private _valueInput: HTMLSpanElement;

  public get title(): string {
    return this._input.value;
  }
  public set title(value: string) {
    this._input.value = value;
  }

  public get id(): number {
    return this.selectedId;
  }
  public set id(value: number) {
    this.selectedId = value;
    this._valueInput.innerText = value ? value.toString() : "";
  }

  protected selectedId?: number;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);

    this._input = this.element.querySelector("[data-bc-text-input]");
    this._valueInput = this.element.querySelector("[data-bc-select-value]");
    if (this.isDisabled) {
      this._input.setAttribute("disabled", "");
    } else {
      this._input.addEventListener(
        "keyup",
        this.displaySuggestionListAsync.bind(this)
      );
    }
    // this._input.addEventListener(
    //   "focusout",
    //   this.displaySuggestionListAsync.bind(this)
    // );
    const value = answer?.values[0];
    if (value) {
      this.getValueAsync(value.value).then((fixValue) =>
        this.setValue(fixValue)
      );
    }
  }

  protected setValue(value: IFixValue): void {
    this.id = value.id;
    this.title = value.value;
  }

  protected async getValueAsync(id: number): Promise<IFixValue> {
    const rootUrl = this.part.link.split("?")[0];
    const queryStringParams =
      await this.owner.options.getQueryStringParamsAsync();
    const url = Util.formatString(`${rootUrl}?fixid=${id}`, queryStringParams);
    return await Util.getDataAsync<IFixValue>(url);
  }

  private async displaySuggestionListAsync(e: KeyboardEvent) {
    const term = this._input.value;
    const queryStringParams =
      await this.owner.options.getQueryStringParamsAsync();
    const url = Util.formatString(this.part.link, {
      term,
      ...queryStringParams,
    });
    const ul = this.element.querySelector<HTMLUListElement>("[data-bc-result]");
    ul.innerHTML = "";
    const result = await Util.getDataAsync<Array<IFixValue>>(url);

    if (result?.length > 0) {
      result.forEach((item) => {
        const li = document.createElement("li");
        li.setAttribute("data-bc-value", item.value);
        li.setAttribute("data-sys-hover", "");
        li.setAttribute("data-sys-text", "");
        li.innerHTML = item.value;
        li.addEventListener("dblclick", (e) => {
          e.preventDefault();
          this.setValue(item);
          ul.innerHTML = "";
        });
        ul.appendChild(li);
      });
    }
  }

  public getValidationErrorsAsync(): Promise<IValidationError> {
    return Promise.resolve(this.ValidateValue(this._input.value));
  }

  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer && this.selectedId) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.selectedId,
            title: this.title,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }

  public getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (
      this.answer &&
      this.selectedId &&
      this.answer.values[0].value != this.selectedId
    ) {
      retVal = {
        part: this.part.part,
        values: [
          {
            id: this.answer.values[0].id,
            value: this.selectedId,
            title: this.title,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer && !this.selectedId) {
      retVal = this.answer;
    }
    return Promise.resolve(retVal);
  }

  public getValuesAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.selectedId) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.selectedId,
            title: this.title,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }
}
