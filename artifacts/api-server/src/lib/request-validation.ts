import {
  CreateClientBody,
  UpdateClientBody,
  CreateProjectBody,
  UpdateProjectBody,
  CreateTaskBody,
  UpdateTaskBody,
} from "@workspace/api-zod";

// Keep generated API schemas intact; normalize required names before validating.
const clientName = CreateClientBody.shape.name
  .trim()
  .min(1, "Enter a client name");
const projectName = CreateProjectBody.shape.name
  .trim()
  .min(1, "Enter a project name");
const taskTitle = CreateTaskBody.shape.title
  .trim()
  .min(1, "Enter a task title");
const changesRequired = { message: "Provide at least one field to update" };

export const CreateClientInput = CreateClientBody.extend({ name: clientName });
export const UpdateClientInput = UpdateClientBody.extend({
  name: clientName.optional(),
}).refine((data) => Object.keys(data).length > 0, changesRequired);
export const CreateProjectInput = CreateProjectBody.extend({
  name: projectName,
});
export const UpdateProjectInput = UpdateProjectBody.extend({
  name: projectName.optional(),
}).refine((data) => Object.keys(data).length > 0, changesRequired);
export const CreateTaskInput = CreateTaskBody.extend({ title: taskTitle });
export const UpdateTaskInput = UpdateTaskBody.extend({
  title: taskTitle.optional(),
}).refine((data) => Object.keys(data).length > 0, changesRequired);
