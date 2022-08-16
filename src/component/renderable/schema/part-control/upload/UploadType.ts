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

declare const $bc: IBCUtil;

export default class UploadType extends EditableQuestionPart {
  protected readonly input: HTMLInputElement;
  protected multiple: boolean = false;
  protected files: IDictionary<IFileInfo>;

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.input = this.element.querySelector<any>("[data-bc-file-input]");
    this.files = {};

    this.input.addEventListener("change", (e) => {
      e.preventDefault();
      this.addFilesFromClient(this.input);
    });
    if (this.part.multiple) {
      this.input.setAttribute("multiple", "");
    } else {
      this.input.removeAttribute("multiple");
    }
    // this.initializeAsync();
    if (answer) {
      this.setValue(answer.values);
    }
  }

  // initializeAsync(): Promise<void> {
  //   this.input.addEventListener("change", (e) => {
  //     e.preventDefault();
  //     this.addFilesFromClient(this.input);
  //   });
  //   if (this.part.multiple) {
  //     this.input.setAttribute("multiple", "");
  //   } else {
  //     this.input.removeAttribute("multiple");
  //   }
  //   return Promise.resolve();
  // }

  addFilesFromClient(input: HTMLInputElement) {
    const files = Array.from(input.files);
    files.forEach((file) => {
      const fileInfo: IFileInfo = {
        mustDelete: false,
        title: file.name,
        type: file.type,
        size: file.size,
        data: file,
      };
      // if (ExtensionList[file.type] === null) {
      //   var oFReader = new FileReader();
      //   oFReader.readAsDataURL(file);
      //   oFReader.onload = (e) => {
      //     fileInfo.image = e.target.result;
      //     this.addFileToUI(fileInfo);
      //   };
      // } else {
      //   this.addFileToUI(fileInfo);
      // }
      this.addFileToUI(fileInfo);
    });
    input.value = "";
  }

  addFileToUI(file: IFileInfo) {
    const container = this.element.querySelector<any>(
      "[data-bc-upload-file-list]"
    );
    const template = imageLayout.replace("@title", file.title);
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
    (imageElement as any).src =
      file.image ?? ExtensionList[file.type] ?? ExtensionList["???"];
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
            title: x.value.title,
            type: x.value.type,
            size: 0,
            url: null,
            image: null,
            data: null,
            mustDelete: false,
          };
          return retVal;
        })
        .forEach((image) => this.addFileToUI(image));
    }
  }

  public getValidationErrorsAsync(): Promise<IValidationError> {
    const filesItems = Object.getOwnPropertyNames(this.files)
      .map((x) => this.files[x])
      .filter((x) => !x.mustDelete)
      .map((x) => {
        return { title: x.title, size: x.size, type: x.type };
      });
    return Promise.resolve(this.ValidateValue(filesItems));
  }

  public async getChangedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    const l = new Array<FileReader>();
    const process = Object.getOwnPropertyNames(this.files)
      .map((x) => this.files[x])
      .filter((x) => x.data)
      .map((x) => {
        return new Promise<IFileValue>((resolve, reject) => {
          const reader = new FileReader();
          l.push(reader);
          reader.readAsDataURL(x.data);
          reader.onload = () =>
            resolve({
              content: reader.result,
              name: x.title,
              size: x.size,
              type: x.type,
            });
          reader.onerror = (error) => reject(error);
        });
      });
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
            value: x,
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
    console.table(this.files);
    console.log(retVal);
    return Promise.resolve(retVal);
  }
}

interface IFileValue {
  content: any;
  name: string;
  type: string;
  size: number;
}
