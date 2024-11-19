import layout from "./assets/layout.html";
import itemLayout from "./assets/item-layout.html";
import Question from "../../../question/Question";
import { IPartCollection } from "../../../IAnswerSchema";
import { IQuestionPart } from "../../../IQuestionSchema";
import { type } from "../SelectListType";
import RadioListType from "./RadioListType";

export default class RadioListTypeDefault extends RadioListType {
  protected get controlType(): type {
    return "radio";
  }
  protected get itemLayout(): string {
    return itemLayout;
  }

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }
}
