import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart } from "../IQuestionSchema";
import { IUserActionPart } from "../IUserActionResult";
import IValidationError from "../IValidationError";
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

  public getValidationErrorsAsync(): Promise<IValidationError> {
    throw new Error("Method not supported.");
  }

  public getAddedAsync(): Promise<IUserActionPart> {
    throw new Error("Method not supported.");
  }
  public getEditedAsync(): Promise<IUserActionPart> {
    throw new Error("Method not supported.");
  }
  public getDeletedAsync(): Promise<IUserActionPart> {
    throw new Error("Method not supported.");
  }
  public getSubEditedAsync(): Promise<IUserActionPart> {
    throw new Error("Method not supported.");
  }
}
