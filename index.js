const mongoose = require('mongoose');
const readlineSync = require('readline-sync');
const bcrypt = require('bcryptjs');
const colors = require('colors');
const connectDB = require('./db');
const { User, Task } = require('./models');

// Function to disconnect from MongoDB
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log(colors.yellow('MongoDB disconnected.'));
  } catch (err) {
    console.error(err.message);
  }
}

async function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

async function register() {
  let username;

  while (true) {
    username = readlineSync.question('Enter username: ');

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(colors.red('Username already taken. Please choose a different username.'));
    } else {
      break;
    }
  }

  const password = readlineSync.question('Enter password: ', { hideEchoBack: true });
  if (!await validatePassword(password)) {
    console.log(colors.red('Password must be at least 8 characters long and contain a number and a special character.'));
    return;
  }
  const email = readlineSync.question('Enter email: ');

  const hashedPassword = bcrypt.hashSync(password, 8);
  const newUser = new User({ username, password: hashedPassword, email, plainPassword: password });
  await newUser.save();

  console.log(colors.green('User registered successfully.'));
}

async function login() {
  const username = readlineSync.question('Enter username: ');
  const password = readlineSync.question('Enter password: ', { hideEchoBack: true });

  const user = await User.findOne({ username });

  if (user && bcrypt.compareSync(password, user.password)) {
    console.log(colors.green('Login successful.'));
    currentUser = user;
  } else {
    console.log(colors.red('Invalid username or password.'));
  }
}

async function resetPassword() {
  const username = readlineSync.question('Enter your username: ');

  const user = await User.findOne({ username });

  if (!user) {
    console.log(colors.red('Username not found.'));
    return;
  }

  const currentPassword = readlineSync.question('Enter your current password: ', { hideEchoBack: true });

  if (bcrypt.compareSync(currentPassword, user.password)) {
    const newPassword = readlineSync.question('Enter your new password: ', { hideEchoBack: true });
    if (!await validatePassword(newPassword)) {
      console.log(colors.red('Password must be at least 8 characters long and contain a number and a special character.'));
      return;
    }
    user.password = bcrypt.hashSync(newPassword, 8);
    user.plainPassword = newPassword;
    await user.save();
    console.log(colors.green('Password reset successfully.'));
  } else {
    console.log(colors.red('Incorrect current password.'));
  }
}

async function forgotPassword() {
  const username = readlineSync.question('Enter your username: ');
  const email = readlineSync.question('Enter your email: ');

  const user = await User.findOne({ username, email });

  if (!user) {
    console.log(colors.red('Username or email is incorrect.'));
    return;
  }

  const newPassword = readlineSync.question('Enter your new password: ', { hideEchoBack: true });
  if (!await validatePassword(newPassword)) {
    console.log(colors.red('Password must be at least 8 characters long and contain a number and a special character.'));
    return;
  }

  user.password = bcrypt.hashSync(newPassword, 8);
  user.plainPassword = newPassword;
  await user.save();
  console.log(colors.green('Password updated successfully.'));
}

async function deleteUser() {
  if (!currentUser) {
    console.log(colors.red('You need to log in first.'));
    return;
  }

  const password = readlineSync.question('Enter your password: ', { hideEchoBack: true });

  if (bcrypt.compareSync(password, currentUser.password)) {
    await User.deleteOne({ username: currentUser.username });
    await Task.deleteMany({ username: currentUser.username });
    currentUser = null;
    console.log(colors.green('User and their tasks deleted successfully.'));
  } else {
    console.log(colors.red('Incorrect password or user not found.'));
  }
}

async function addTask() {
  if (!currentUser) {
    console.log(colors.red('You need to log in first.'));
    return;
  }

  const title = readlineSync.question('Enter task title: ');

  const newTask = new Task({ title, completed: false, username: currentUser.username, sharedWith: [] });
  await newTask.save();

  console.log(colors.green('Task added successfully.'));
}

async function listTasks() {
  if (!currentUser) {
    console.log(colors.red('You need to log in first.'));
    return;
  }

  const tasks = await Task.find({ $or: [{ username: currentUser.username }, { sharedWith: currentUser.username }] });

  if (tasks.length === 0) {
    console.log(colors.yellow('No tasks found.'));
    return;
  }

  tasks.forEach((task, index) => {
    const sharedMessage = task.username !== currentUser.username ? ` (Shared by: ${task.username})` : '';
    const status = task.completed ? colors.green('[Completed]') : '';
    console.log(`${index + 1}. ${colors.blue(task.title)} ${status}${sharedMessage}`);
  });
}

async function deleteTask() {
  const tasks = await Task.find({ username: currentUser.username });
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title} ${task.completed ? '[Completed]' : ''}`);
  });

  const taskNumber = parseInt(readlineSync.question('Enter task number to delete: '), 10);

  if (taskNumber > 0 && taskNumber <= tasks.length) {
    const taskToDelete = tasks[taskNumber - 1];
    await Task.deleteOne({ _id: taskToDelete._id });
    console.log(colors.green('Task deleted successfully.'));
  } else {
    console.log(colors.red('Invalid task number.'));
  }
}

async function completeTask() {
  const tasks = await Task.find({ $or: [{ username: currentUser.username }, { sharedWith: currentUser.username }] });
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title} ${task.completed ? '[Completed]' : ''}`);
  });

  const taskNumber = parseInt(readlineSync.question('Enter task number to mark as completed: '), 10);

  if (taskNumber > 0 && taskNumber <= tasks.length) {
    const taskToComplete = tasks[taskNumber - 1];
    taskToComplete.completed = true;
    await taskToComplete.save();
    console.log(colors.green('Task marked as completed.'));
  } else {
    console.log(colors.red('Invalid task number.'));
  }
}

async function shareTask() {
  if (!currentUser) {
    console.log(colors.red('You need to log in first.'));
    return;
  }

  const tasks = await Task.find({ username: currentUser.username });
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title}`);
  });

  const taskNumber = parseInt(readlineSync.question('Enter task number to share: '), 10);
  const usernameToShareWith = readlineSync.question('Enter username to share the task with: ');

  const userToShareWith = await User.findOne({ username: usernameToShareWith });

  if (!userToShareWith) {
    console.log(colors.red('Username to share with does not exist.'));
    return;
  }

  if (taskNumber > 0 && taskNumber <= tasks.length) {
    const taskToShare = tasks[taskNumber - 1];
    taskToShare.sharedWith.push(usernameToShareWith);
    await taskToShare.save();
    console.log(colors.green(`Task shared with ${usernameToShareWith} successfully.`));
  } else {
    console.log(colors.red('Invalid task number.'));
  }
}

async function editTask() {
  if (!currentUser) {
    console.log(colors.red('You need to log in first.'));
    return;
  }

  const tasks = await Task.find({ username: currentUser.username });
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title}`);
  });

  const taskNumber = parseInt(readlineSync.question('Enter task number to edit: '), 10);

  if (taskNumber > 0 && taskNumber <= tasks.length) {
    const taskToEdit = tasks[taskNumber - 1];
    const newTitle = readlineSync.question('Enter new task title: ');
    taskToEdit.title = newTitle;
    await taskToEdit.save();
    console.log(colors.green('Task edited successfully.'));
  } else {
    console.log(colors.red('Invalid task number.'));
  }
}

// Initialize currentUser as null
let currentUser = null;

// Main program
async function main() {
  const options = `
1. Register   2. Login   3. Reset Password   4. Forgot Password   5. Delete User
6. Add Task   7. List Tasks   8. Share Task   9. Delete Task
10. Complete Task   11. Edit Task   12. Exit
`;

  let choice;

  while (choice !== 12) {
    console.log(options);
    choice = parseInt(readlineSync.question('Choose an option: '), 10);

    switch (choice) {
      case 1:
        await register();
        break;
      case 2:
        await login();
        break;
      case 3:
        await resetPassword();
        break;
      case 4:
        await forgotPassword();
        break;
      case 5:
        await deleteUser();
        break;
      case 6:
        await addTask();
        break;
      case 7:
        await listTasks();
        break;
      case 8:
        await shareTask();
        break;
      case 9:
        await deleteTask();
        break;
      case 10:
        await completeTask();
        break;
      case 11:
        await editTask();
        break;
      case 12:
        console.log(colors.yellow('Goodbye!'));
        await disconnectDB();
        break;
      default:
        console.log(colors.red('Invalid option. Please try again.'));
    }
  }
}

// Connect to DB and then start main program
connectDB()
  .then(() => main())
  .catch(err => console.error(err));
