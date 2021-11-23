import Question from "../question/Question";
import layout from "./assets/layout.html";
import Util from "../../../../Util";
import { IQuestionPart, IPartCollection } from "../ISchema";
import { IUserActionPart } from "../IUserActionResult";

export default abstract class QuestionPart {
  public readonly part: IQuestionPart;
  protected readonly element: Element;
  protected readonly owner: Question;
  protected readonly answer: IPartCollection;

  constructor(
    part: IQuestionPart,
    partLayout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    this.owner = owner;
    this.answer = answer;
    this.part = part;
    this.element = Util.parse(layout).querySelector("[data-bc-part]");
    this.element.innerHTML = partLayout;
    this.owner.element.appendChild(this.element);
    this.element.setAttribute("data-bc-part-related-cell", "");
  }

  protected formatString(): string {
    const data = {
      prpId: this.owner.question.prpId,
      part: this.part.part,
    };
    const url = Util.formatString(this.part.link, data);
    return url;
  }

  public abstract getAdded(): IUserActionPart;
  public abstract getEdited(): IUserActionPart;
  public abstract getDeleted(): IUserActionPart;
}
