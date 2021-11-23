import { IQuestionPart, IPartCollection } from "../ISchema";
import { IValidationError, IUserActionPart } from "../IUserActionResult";
import Question from "../question/Question";
import ListBaseType from "./ListBaseType";

export default abstract class ReadOnlyListBaseType extends ListBaseType {
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
