import ListBaseType from "../ListBaseType";
import Question from "../../question/Question";
import Util from "../../../../../Util";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import { IUserActionPartValue, IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";

export default abstract class SelectListType extends ListBaseType {
  static _seedId: number = 0;
  public rndName : string;
  
  protected abstract get controlType():type;
  protected abstract get itemLayout():string;

  constructor(part: IQuestionPart, layout: string, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  private getChangeSet(): Array<Array<IUserActionPartValue>> {
    let addedItems: Array<IUserActionPartValue> = null;
    let deletedItems: Array<IUserActionPartValue> = null;

    const selectedItems = Array.from(this.element.querySelectorAll("input"))
      .map((x) => (x.checked ? parseInt(x.value) : null))
      .filter((x) => x);

    if (this.answer) {
      deletedItems = this.answer.values
        .filter((x) => selectedItems.indexOf(x.value) == -1)
        .map((x) => {
          return { id: x.id, value: x.value };
        });
      addedItems = selectedItems
        .filter((x) => !this.answer.values.find((y) => y.value == x))
        .map((x) => {
          return { value: x };
        });
    } else {
      addedItems = selectedItems.map((x) => {
        return { value: x };
      });
    }
    return [
      addedItems?.length > 0 ? addedItems : null,
      deletedItems?.length > 0 ? deletedItems : null,
    ];
  }

  protected fillUI(values: Array<IFixValue>) {
    this.rndName = "radio" + (++SelectListType._seedId).toString();
    values.forEach((item) => {
      const newTemplate = this.itemLayout
        .replace("@type", this.controlType)
        .replace("@title", item.value)
        .replace("@value", item.id.toString())
        .replace(
          "@name",
          this.controlType == "radio" ? this.rndName : ""
        ).replace(
          "@checked",
          this.answer?.values.find((x) => x.value == item.id) ? "checked" : ""
        );

      const template = Util.parse(newTemplate).querySelector("div");
      this.element.querySelector("div").appendChild(template);
    });
  }

  public getValidationErrors(): IValidationError {
    const selectedItems = Array.from(this.element.querySelectorAll("input"))
      .map((x) => (x.checked ? parseInt(x.value) : null))
      .filter((x) => x);
    return this.ValidateValue(selectedItems);
  }

  public getAdded(): IUserActionPart {
    let retVal = null;
    const [addedItems, _] = this.getChangeSet();
    if (addedItems) {
      retVal = {
        part: this.part.part,
        values: addedItems,
      };
    }
    return retVal;
  }

  public getEdited(): IUserActionPart {
    return null;
  }

  public getDeleted(): IUserActionPart {
    let retVal = null;
    const [_, deletedItems] = this.getChangeSet();
    if (deletedItems) {
      retVal = {
        part: this.part.part,
        values: deletedItems,
      };
    }
    return retVal;
  }
}

export type type = "checkbox" | "radio";