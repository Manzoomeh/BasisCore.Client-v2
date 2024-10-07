import IAnswerSchema, { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import Question from "../../question/Question";
import ListBaseType from "../ListBaseType";
import layout from "./assets/layout.html";

export default class SelectType extends ListBaseType {
  private readonly _select: HTMLSelectElement;
  private preSelectedValue: string;

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._select = this.element.querySelector("select");
    if (this.isDisabled) {
      this._select.setAttribute("disabled", "");
    } else if (this.isReadonly) {
      this._select.setAttribute("readonly", "");
    }
    this._select.addEventListener("change", (e) => {
      e.preventDefault();
      if (this.hasSubSchema) {
        const item = this._select.options[this._select.selectedIndex];
        const value = this.answer?.values[0];
        const relatedSubSchemaAnswer =
          value && item.value == value.value ? value.answer : null;
        this.onItemSelected(item, relatedSubSchemaAnswer);
      }
    });
  }

  private onItemSelected(item: HTMLOptionElement, answer: IAnswerSchema) {
    if (this.hasSubSchema) {
      const schemaId = item.getAttribute("data-schema-id");
      const lid = item.getAttribute("data-lid");
      const schemaVersion = item.getAttribute("data-schema-version");
      const paramUrl = item.getAttribute("data-param-url");
      if (this.preSelectedValue) {
        this.unloadSchemaAsync(this.preSelectedValue);
      }
      if (schemaId) {
        this.preSelectedValue = item.value;
        this.loadSubSchemaAsync(
          item.value,
          schemaId,
          paramUrl,
          schemaVersion,
          lid,
          item.parentElement.nextElementSibling,
          answer
        );
      }
    }
  }

  protected fillUI(values: Array<IFixValue>) {
    super.fillUI(values);
    const select = this.element.querySelector("select");
    const value = this.answer?.values[0];
    values.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id.toString();
      option.text = item.value;
      if (item.schema) {
        option.setAttribute("data-schema-id", item.schema.schemaId ?? "");
        option.setAttribute("data-lid", item.schema.lid?.toString() ?? "");
        option.setAttribute("data-param-url", item.schema.paramUrl);
        option.setAttribute(
          "data-schema-version",
          item.schema.schemaVersion ?? ""
        );
      }
      option.selected = value ? value.value == item.id : item.selected ?? false;
      select.options.add(option);
      if (option.selected) {
        this.onItemSelected(option, value?.answer);
      }
    });
  }

  public async getValidationErrorsAsync(): Promise<IValidationError> {
    const value = this._select.options[this._select.selectedIndex].value;
    const subSchemaIsOk = await super.allSubSchemaIsOkAsync();
    const retVal = await await this.ValidateValue(
      value === "0" ? null : value,
      !subSchemaIsOk
    );
    return retVal;
  }

  public async getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;

    if (!this.answer) {
      const newValue = this._select.options[this._select.selectedIndex].value;
      if (newValue !== "0") {
        const subSchemaValue = await this.getSubSchemaValueAsync(newValue);
        retVal = {
          part: this.part.part,
          values: [
            {
              value: newValue,
              ...(subSchemaValue && { answer: subSchemaValue }),
            },
          ],
        };
      }
    }
    return retVal;
  }

  public async getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const newValue = this._select.options[this._select.selectedIndex].value;
      const changed = newValue != this.answer.values[0].value;
      if (changed && newValue != "0") {
        const subSchemaValue = await this.getSubSchemaValueAsync(newValue);
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: newValue,
              ...(subSchemaValue && { answer: subSchemaValue }),
            },
          ],
        };
      } else if (this.hasSubSchema) {
        const subSchemaValue = await this.getSubSchemaValueAsync(newValue);
        if (subSchemaValue)
          retVal = {
            part: this.part.part,
            values: [
              {
                id: this.answer.values[0].id,
                answer: subSchemaValue,
              },
            ],
          };
      }
    }
    return retVal;
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
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
    return Promise.resolve(retVal);
  }

  public async getValuesAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const newValue = this._select.options[this._select.selectedIndex].value;
    if (newValue !== "0") {
      const subSchemaValue = await this.getSubSchemaValueAsync(newValue);
      retVal = {
        part: this.part.part,
        values: [
          {
            value: newValue,
            ...(subSchemaValue && { answer: subSchemaValue }),
          },
        ],
      };
    }
    return retVal;
  }
}
