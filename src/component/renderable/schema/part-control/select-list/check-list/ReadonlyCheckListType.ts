import layout from "./assets/layout.html";
import itemLayout from "./assets/readonly-item-layout.html";
import Question from "../../../question/Question";
import { IPartCollection } from "../../../IAnswerSchema";
import { IQuestionPart } from "../../../IQuestionSchema";
import ReadonlySelectListType from "../ReadonlySelectListType";

export default class ReadonlyCheckListType extends ReadonlySelectListType {
  protected get itemLayout(): string {
    return itemLayout
  }

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }
}
