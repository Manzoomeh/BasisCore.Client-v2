import Util from "../../../../../Util";
import { IPartCollection } from "../../IAnswerSchema";
import { IFixValue, IQuestionPart } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import Question from "../../question/Question";
import layout from "./assets/layout.html";

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
    this._valueInput = this.element.querySelector("[data-bc-value]");
    // this._input.addEventListener(
    //   "keyup",
    //   this.displaySuggestionListAsync.bind(this)
    // );
    this._input.addEventListener(
      "focusout",
      this.displaySuggestionListAsync.bind(this)
    );
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
    const url = `${rootUrl}?fixid=${id}`;
    return await Util.getDataAsync<IFixValue>(url);
  }

  private async displaySuggestionListAsync(e: KeyboardEvent) {
    const term = this._input.value;
    const url = Util.formatString(this.part.link, { term });
    const result = await Util.getDataAsync<Array<IFixValue>>(url);
    console.log(result);
    if (result?.length > 0) {
      this.setValue(result[0]);
    }
  }

  public getValidationErrors(): IValidationError {
    return this.ValidateValue(this._input.value);
  }

  public getAdded(): IUserActionPart {
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
    return retVal;
  }

  public getEdited(): IUserActionPart {
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
    return retVal;
  }

  public getDeleted(): IUserActionPart {
    let retVal = null;
    if (this.answer && !this.selectedId) {
      retVal = this.answer;
    }
    return retVal;
  }
}
