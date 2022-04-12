import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import Question from "../../question/Question";
import ListBaseType from "../ListBaseType";
import layout from "./assets/layout.html";

export default class SelectType extends ListBaseType {
  private readonly _select: HTMLSelectElement;

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._select = this.element.querySelector("select");
    if (this.isDisabled) {
      this._select.setAttribute("disabled", "");
    }
  }

  protected fillUI(values: Array<IFixValue>) {
    const select = this.element.querySelector("select");
    const value = this.answer?.values[0];
    values.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id.toString();
      option.text = item.value;
      option.selected = value ? value.value == item.id : item.selected ?? false;
      select.options.add(option);
    });
  }

  public getValidationErrors(): IValidationError {
    const value = this._select.options[this._select.selectedIndex].value;

    return this.ValidateValue(value === "0" ? null : value);
  }

  public getAdded(): IUserActionPart {
    let retVal = null;

    if (!this.answer) {
      const newValue = this._select.options[this._select.selectedIndex].value;
      if (newValue !== "0") {
        retVal = {
          part: this.part.part,
          values: [
            {
              value: this._select.options[this._select.selectedIndex].value,
            },
          ],
        };
      }
    }
    return retVal;
  }

  public getEdited(): IUserActionPart {
    let retVal = null;
    if (this.answer) {
      const newValue = this._select.options[this._select.selectedIndex].value;
      const changed = newValue != this.answer.values[0].value;
      if (changed && newValue != "0") {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: newValue,
            },
          ],
        };
      }
    }
    return retVal;
  }

  public getDeleted(): IUserActionPart {
    let retVal = null;
    if (this.answer) {
      const newValue = this._select.options[this._select.selectedIndex].value;
      const changed = newValue != this.answer.values[0].value;
      if (changed && newValue == "0") {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: newValue,
            },
          ],
        };
      }
    }
    return retVal;
  }
}
