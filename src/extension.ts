import * as vscode from 'vscode';
import { ChatItem, ChatListProvider } from "./chatListProvider";
import { MessageViewProvider } from "./chatWebProvider";
import { Manager } from "./manage";
import { WsClient } from './ws';

export function activate(context: vscode.ExtensionContext) {
	const manager = new Manager(context);
	const wsClient = new WsClient();
	const chatListProvider = new ChatListProvider();
	const messageViewProvider = new MessageViewProvider(context.extensionUri, wsClient);

	vscode.window.createTreeView('personList', { treeDataProvider: chatListProvider });

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('messageList', messageViewProvider),
		vscode.commands.registerCommand('chatcode-hub.selectPerson', (person: ChatItem) => {
			messageViewProvider.showMessagesForPerson(person);
		}),
		vscode.commands.registerCommand('chatcode-hub.refresh', () => chatListProvider.refresh()),
		vscode.commands.registerCommand("chatcode-hub.login", () => manager.login()),
		vscode.commands.registerCommand("chatcode-hub.logout", () => manager.logout()),
		vscode.commands.registerCommand("chatcode-hub.ws", () => wsClient.connectWebSocket()),
	);

}

export function deactivate() { }
