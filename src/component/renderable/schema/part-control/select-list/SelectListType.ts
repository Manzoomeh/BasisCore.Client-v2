import ListBaseType from "../ListBaseType";
import Question from "../../question/Question";
import Util from "../../../../../Util";
import IAnswerSchema, { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import { IUserActionPartValue, IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";

export default abstract class SelectListType extends ListBaseType {
  static _seedId: number = 0;
  public rndName: string;

  protected abstract get controlType(): type;
  protected abstract get itemLayout(): string;

  constructor(
    part: IQuestionPart,
    layout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, layout, owner, answer);
  }

  public getSelectedItems(): Array<number> {
    return Array.from(this.element.querySelectorAll("input"))
      .map((x) => (x.checked ? parseInt(x.value) : null))
      .filter((x) => x);
  }

  private async getAllSet(): Promise<Array<IUserActionPartValue>> {
    const selectedItems = Array.from(this.element.querySelectorAll("input"))
      .map((x) => (x.checked ? parseInt(x.value) : null))
      .filter((x) => x);

    return await Promise.all(
      selectedItems.map(async (x) => {
        const answer = this.hasSubSchema
          ? await this.getSubSchemaValueAsync(x.toString())
          : null;
        return {
          value: x,
          ...(answer && { answer: answer }),
        };
      })
    );
  }

  private async getChangeSet(): Promise<Array<Array<IUserActionPartValue>>> {
    let addedItems: Array<IUserActionPartValue> = null;
    let deletedItems: Array<IUserActionPartValue> = null;
    let subEditedItems: Array<IUserActionPartValue> = null;

    const selectedItems = Array.from(this.element.querySelectorAll("input"))
      .map((x) => (x.checked ? parseInt(x.value) : null))
      .filter((x) => x);

    if (this.answer) {
      deletedItems = this.answer.values
        .filter((x) => selectedItems.indexOf(x.value) == -1)
        .map((x) => {
          return { id: x.id, value: x.value };
        });
      addedItems = await Promise.all(
        selectedItems
          .filter((x) => !this.answer.values.find((y) => y.value == x))
          .map(async (x) => {
            const answer = this.hasSubSchema
              ? await this.getSubSchemaValueAsync(x.toString())
              : null;
            return {
              value: x,
              ...(answer && { answer: answer }),
            };
          })
      );
      subEditedItems = (
        await Promise.all(
          selectedItems
            .filter((x) => this.answer.values.find((y) => y.value == x))
            .map(async (x) => {
              return {
                value: x,
                answer: this.hasSubSchema
                  ? await this.getSubSchemaValueAsync(x.toString())
                  : null,
              };
            })
        )
      ).filter((x) => x.answer);
    } else {
      addedItems = await Promise.all(
        selectedItems.map(async (x) => {
          const answer = this.hasSubSchema
            ? await this.getSubSchemaValueAsync(x.toString())
            : null;
          return {
            value: x,
            ...(answer && { answer: answer }),
          };
        })
      );
    }
    return [
      addedItems?.length > 0 ? addedItems : null,
      deletedItems?.length > 0 ? deletedItems : null,
      subEditedItems?.length > 0 ? subEditedItems : null,
    ];
  }

  protected abstract onValueItemClick(
    value: IFixValue,
    element: HTMLInputElement,
    answer?: IAnswerSchema
  );

  protected fillUI(values: Array<IFixValue>) {
    super.fillUI(values);
    this.rndName = "radio" + (++SelectListType._seedId).toString();
    values.forEach((item) => {
      const answerItem = this.answer?.values.find((x) => x.value == item.id);
      const checked = this.answer
        ? answerItem ?? false
        : item.selected ?? false;

      const newTemplate = this.itemLayout
        .replace("@type", this.controlType)
        .replace("@title", item.value)
        .replace("@value", item.id.toString())
        .replace("@name", this.controlType == "radio" ? this.rndName : "")
        .replace("@checked", checked ? "checked" : "")
        .replace("@disabled", this.isDisabled ? "disabled" : "");

      const template = Util.parse(newTemplate).querySelector("div");
      this.element.querySelector("[data-bc-items]").appendChild(template);
      if (this.hasSubSchema) {
        const element = template.querySelector("input");
        if (checked) {
          this.onValueItemClick(item, element, answerItem?.answer);
        }
        element.addEventListener("change", (e) => {
          e.preventDefault();
          this.onValueItemClick(
            item,
            e.target as HTMLInputElement,
            answerItem?.answer
          );
        });
      }
    });
  }

  public getValidationErrorsAsync(): Promise<IValidationError> {
    const selectedItems = Array.from(this.element.querySelectorAll("input"))
      .map((x) => (x.checked ? parseInt(x.value) : null))
      .filter((x) => x);
    return Promise.resolve(this.ValidateValue(selectedItems));
  }

  public async getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const [addedItems, _] = await this.getChangeSet();
    if (addedItems) {
      retVal = {
        part: this.part.part,
        values: addedItems,
      };
    }
    return retVal;
  }

  public async getEditedAsync(): Promise<IUserActionPart> {
    let retVal: IUserActionPart = null;
    if (this.hasSubSchema) {
      const [_, __, subEditedItems] = await this.getChangeSet();
      if (subEditedItems) {
        retVal = {
          part: this.part.part,
          values: subEditedItems,
        };
      }
    }
    return retVal;
  }

  public async getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const [_, deletedItems, __] = await this.getChangeSet();
    if (deletedItems) {
      retVal = {
        part: this.part.part,
        values: deletedItems,
      };
    }
    return retVal;
  }

  public async getValuesAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const all = await this.getAllSet();
    if (all) {
      retVal = {
        part: this.part.part,
        values: all,
      };
    }
    return retVal;
  }
}

export type type = "checkbox" | "radio";
