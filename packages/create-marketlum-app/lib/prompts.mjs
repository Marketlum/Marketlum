import prompts from 'prompts';
import pc from 'picocolors';

const NAME_REGEX = /^[a-z][a-z0-9-]*$/;

function validateName(name) {
  if (!name) return 'Project name is required';
  if (!NAME_REGEX.test(name)) {
    return 'Project name must be lowercase, start with a letter, and contain only alphanumeric characters and hyphens';
  }
  return true;
}

export async function getProjectName() {
  const arg = process.argv[2];

  if (arg) {
    const validation = validateName(arg);
    if (validation !== true) {
      throw new Error(validation);
    }
    return arg;
  }

  const response = await prompts(
    {
      type: 'text',
      name: 'projectName',
      message: 'What is your project name?',
      validate: validateName,
    },
    {
      onCancel: () => {
        console.log(pc.red('Operation cancelled.'));
        process.exit(1);
      },
    },
  );

  return response.projectName;
}
