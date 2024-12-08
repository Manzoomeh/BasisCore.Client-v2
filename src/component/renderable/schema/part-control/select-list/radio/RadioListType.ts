import itemLayout from "./assets/item-layout.html";
import Question from "../../../question/Question";
import { IPartCollection } from "../../../IAnswerSchema";
import { IFixValue, IQuestionPart } from "../../../IQuestionSchema";
import SelectListType, { type } from "../SelectListType";

export default class RadioListType extends SelectListType {
  protected get controlType(): type {
    return "radio";
  }
  protected get itemLayout(): string {
    return itemLayout;
  }

  constructor(part: IQuestionPart, layout: string, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected onValueItemClick(value: IFixValue, element: HTMLInputElement) {
    this.loadSubSchemaAsync(
      value.id,
      element.checked ? value.schema?.schemaId : null,
      value.schema?.paramUrl,
      value.schema?.schemaVersion,
      value.schema?.lid,
      element.parentElement.parentElement.nextElementSibling
    );
  }

  protected fillUI(values: Array<IFixValue>) {
    super.fillUI(values);
  }
}
