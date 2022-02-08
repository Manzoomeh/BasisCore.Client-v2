import Question from "../question/Question";
import QuestionPart from "./QuestionPart";
import { IUserActionPart } from "../IUserActionResult";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart } from "../IQuestionSchema";
import IValidationError from "../IValidationError";

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
