import layout from "./assets/layout.html";
import itemLayout from "./assets/item-layout.html";
import Question from "../../../question/Question";
import IAnswerSchema, { IPartCollection } from "../../../IAnswerSchema";
import { IFixValue, IQuestionPart } from "../../../IQuestionSchema";
import SelectListType, { type } from "../SelectListType";

export default class CheckListType extends SelectListType {
  protected get controlType(): type {
    return "checkbox";
  }
  protected get itemLayout(): string {
    return itemLayout;
  }

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected onValueItemClick(
    value: IFixValue,
    element: HTMLInputElement,
    answer: IAnswerSchema
  ) {
    if (value.schema) {
      this.loadSubSchemaAsync(
        value.id,
        element.checked ? value.schema.schemaId : null,
        value.schema.paramUrl,
        value.schema.schemaVersion,
        value.schema.lid,
        element.nextElementSibling,
        answer
      );
    }
  }
}
