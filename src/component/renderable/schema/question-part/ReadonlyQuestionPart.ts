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
