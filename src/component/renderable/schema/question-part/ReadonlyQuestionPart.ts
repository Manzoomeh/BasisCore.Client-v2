import Question from "../question/Question";
import layout from "./assets/layout.html";
import { IQuestionPart, IPartCollection } from "../ISchema";
import QuestionPart from "./QuestionPart";
import { IUserActionPart, IValidationError } from "../IUserActionResult";

export default abstract class ReadonlyQuestionPart extends QuestionPart {
  constructor(
    part: IQuestionPart,
    layout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, layout, owner, answer);
  }
  public getValidationErrors(): IValidationError {
    throw new Error("Method not supported.");
  }
  public getAdded(): IUserActionPart {
    throw new Error("Method not supported.");
  }
  public getEdited(): IUserActionPart {
    throw new Error("Method not supported.");
  }
  public getDeleted(): IUserActionPart {
    throw new Error("Method not supported.");
  }
}
