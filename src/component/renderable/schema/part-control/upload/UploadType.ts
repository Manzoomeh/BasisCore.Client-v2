import { IPartCollection, IPartValue } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import Question from "../../question/Question";
import ExtensionList from "./ExtensionList";
import IFileInfo from "./IFileInfo";
import layout from "./assets/layout.html";
import imageLayout from "./assets/image-layout.html";
import "./assets/style";
import IDictionary from "../../../../../IDictionary";
import IBCUtil from "../../../../../wrapper/IBCUtil";
import IFileValue from "./IFileValue";

declare const $bc: IBCUtil;

export default class UploadType extends EditableQuestionPart {
  protected readonly input: HTMLInputElement;
  protected multiple: boolean = false;
  protected files: IDictionary<IFileInfo>;
  protected filesPath: string;

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.input = this.element.querySelector<any>("[data-bc-file-input]");
    this.files = {};
    this.filesPath = owner.options.filesPath ?? "";
    this.input.addEventListener("change", (e) => {
      e.preventDefault();
      this.addFilesFromClient(this.input);
    });
    if (this.part.multiple) {
      this.input.setAttribute("multiple", "");
    } else {
      this.input.removeAttribute("multiple");
    }
    if (answer) {
      this.setValue(answer.values);
    }
  }

  addFilesFromClient(input: HTMLInputElement) {
    const files = Array.from(input.files);
    files.forEach((file) => {
      const fileInfo: IFileInfo = {
        mustDelete: false,
        name: file.name,
        url: null,
        type: file.type,
        size: file.size,
        data: file,
      };
      this.addFileToUI(fileInfo);
    });
    input.value = "";
  }

  addFileToUI(file: IFileInfo) {
    const container = this.element.querySelector<any>(
      "[data-bc-upload-file-list]"
    );
    let fileUrl = `${this.filesPath}${file.url}`;
    const template = imageLayout
      .replace("@name", file.name)
      .replace("@downloadName", file.name)
      .replace("@url", fileUrl);
    const fileElement = $bc.util.toNode(template).childNodes[0] as Element;
    const imageElement = fileElement.querySelector<HTMLImageElement>(
      "[data-bc-item-icon]"
    );
    const localId = $bc.util.getRandomName("uploader_");
    if (!this.part.multiple) {
      this.files = {};
      container.innerHTML = "";
    }
    this.files[localId] = file;
    if (file.image && file.image != "") {
      (imageElement as any).src = `/${file.image}`;
    } else {
      (imageElement as any).src =
        ExtensionList[file.type] ?? ExtensionList["???"];
    }
    fileElement
      .querySelector("[data-bc-item-btn-delete]")
      .addEventListener("click", (e) => {
        e.preventDefault();
        if (file.id) {
          file.mustDelete = true;
        } else {
          delete this.files[localId];
        }
        fileElement.remove();
      });

    container.append(fileElement);
  }

  setValue(values: IPartValue[]) {
    if (values) {
      values
        .map((x) => {
          const retVal: IFileInfo = {
            id: x.id,
            name: x.value.name,
            type: x.value.type,
            size: x.value.size ?? 0,
            url: x.value.url ?? null,
            image: x.value.image ?? null,
            data: null,
            mustDelete: false,
          };
          return retVal;
        })
        .forEach((image) => this.addFileToUI(image));
    }
  }

  public async getValidationErrorsAsync(): Promise<IValidationError> {
    const filesItems = Object.getOwnPropertyNames(this.files)
      .map((x) => this.files[x])
      .filter((x) => !x.mustDelete)
      .map((x) => {
        return { name: x.name, size: x.size, type: x.type };
      });
    return Promise.resolve(await this.ValidateValue(filesItems));
  }

  protected CreateFileValueAsync(file: IFileInfo): Promise<IFileValue> {
    return new Promise<IFileValue>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file.data);
      reader.onload = () =>
        resolve(<IFileValue>{
          content: reader.result,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      reader.onerror = (error) => reject(error);
    });
  }

  public async getChangedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const process = Object.getOwnPropertyNames(this.files)
      .map((x) => this.files[x])
      .filter((x) => x.data)
      .map((x) => this.CreateFileValueAsync(x));
    let result: Array<IFileValue> = null;
    result = await Promise.all(process);
    const mustAdded = result.map((x) => {
      const retVal: IPartValue = {
        value: x,
      };
      return retVal;
    });
    const newValues = mustAdded.length > 0 ? mustAdded : null;
    if (newValues) {
      retVal = {
        part: this.part.part,
        values: newValues,
      };
    }
    return retVal;
  }

  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer) {
      retVal = this.getChangedAsync();
    }
    return retVal;
  }

  public async getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      retVal = this.getChangedAsync();
    }
    return retVal;
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const mustDelete = Object.getOwnPropertyNames(this.files)
        .map((x) => this.files[x])
        .filter((x) => x.mustDelete)
        .map((x) => {
          const retVal: IPartValue = {
            id: x.id,
            value: {
              name: x.name,
              type: x.type,
            },
          };
          return retVal;
        });
      const deletedValues = mustDelete.length > 0 ? mustDelete : null;

      if (deletedValues) {
        retVal = {
          part: this.part.part,
          values: deletedValues,
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getValuesAsync(): Promise<IUserActionPart> {
    return this.getChangedAsync();
  }
}
