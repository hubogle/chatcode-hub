import * as vscode from 'vscode';
import { ExtensionContext, WebviewView, WebviewViewProvider } from 'vscode';
import WebSocket from 'ws';

interface ChatMessage {
    username: string;
    text: string;
}

export class TodoListWebView implements WebviewViewProvider {

    constructor(
        private readonly context: ExtensionContext
    ) { }

    public static viewId: string = 'chatcode-hub';
    resolveWebviewView(webviewView: WebviewView) {
        webviewView.webview.options = {
            enableScripts: true,
        }
        webviewView.webview.html = getIndexContent();

        // let ws: WebSocket | null = null; // 在函数或类的顶部定义ws
        let chatMessages: ChatMessage[] = []; // 消息列表
        let address: string = '';
        let username: string = '';
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                if (address === '' || username === '') {
                    webviewView.webview.html = getIndexContent();
                    return;
                } else {
                    // WebviewView 变为可见时的处理逻辑
                    webviewView.webview.html = getWebviewContent(chatMessages);
                }
            }
        });
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'submit':
                    address = message.address;
                    username = message.username;
                    const ws = new WebSocket(`ws://${address}`);

                    ws.on('error', function (error) {
                        // console.error(`WebSocket error: ${error}`);
                        vscode.window.showInformationMessage(`${error}`);
                        webviewView.webview.html = getIndexContent();
                    });

                    webviewView.webview.html = getWebviewContent(chatMessages);

                    ws.on('open', function open() {
                        const message = {
                            username: username,
                            text: `${username} joined the group`
                        };
                        ws.send(JSON.stringify(message));
                    });

                    ws.on('message', async function incoming(message) {
                        try {
                            const parsedMessage = JSON.parse(message.toString());
                            chatMessages.push({
                                username: parsedMessage.username,
                                text: parsedMessage.text
                            });
                            webviewView.webview.postMessage({
                                command: 'receive',
                                username: parsedMessage.username,
                                text: parsedMessage.text
                            });
                        } catch (error) {
                            // console.error('Error parsing message:', error);
                            vscode.window.showInformationMessage(`${error}`);
                        }
                    });
                    webviewView.webview.onDidReceiveMessage(message => {
                        switch (message.command) {
                            case 'send':
                                const msg = {
                                    username: username,
                                    text: message.text,
                                };
                                ws.send(JSON.stringify(msg));
                                return;
                        }
                    });
                default:
                    break;
            }
        });
    }
}

function getRandomString(length: number) {
    return Math.random().toString(36).substring(2, 2 + length);
}


function getIndexContent() {
    const username = getRandomString(5);
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat Configuration</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
                    padding: 10px;
                    background-color: var(--vscode-sideBar-background);
                }
                form {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 20px;
                }
                label {
                    font-weight: bold;
                    margin-top: 10px;
                    color: var(--vscode-editor-foreground);
                }
                input[type="text"] {
                    padding: 8px;
                    margin-top: 5px;
                    border-radius: 4px;
                    border: 1px solid #ccc;
                    box-sizing: border-box;
                    border: 1px solid var(--vscode-input-border); /* 输入框边框颜色 */
                    background-color: var(--vscode-input-background); /* 输入框背景颜色 */
                    background-foreground: var(--vscode-input-foreground); /* 输入框输入框前景 */
                    color: var(--vscode-input-foreground); /* 输入框文字颜色 */
                }
                input[type="submit"] {
                    padding: 10px 20px;
                    margin-top: 10px;
                    background-color: var(--vscode-button-background);
                    border: none;
                    border-radius: 4px;
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                input[type="submit"]:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <form id="serverForm">
                <label for="serverAddress">server address:</label>
                <input type="text" id="serverAddress" name="serverAddress" value="127.0.0.1:8080"><br>
                <label for="username">user name:</label>
                <input type="text" id="username" name="username" value="${username}">
                <input type="submit" value="Connect">
            </form>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('serverForm').addEventListener('submit', (event) => {
                    event.preventDefault();
                    const address = document.getElementById('serverAddress').value;
                    const username = document.getElementById('username').value;
                    vscode.postMessage({
                        command: 'submit',
                        address: address,
                        username: username
                    });
                });
            </script>
        </body>
        </html>
    `;
}



function getWebviewContent(chatMessages: ChatMessage[]) {
    const chatHtml = chatMessages.map(message => `
        <div class="message">
            <div class="username">${message.username}</div>
            <div class="text">${message.text}</div>
        </div>
    `).join('');

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat</title>
                <style>
                    body, html {
                        height: 100%;
                        margin: 0;
                        padding: 0; /* 移除左右的 padding */
                        display: flex;
                        flex-direction: column;
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-sideBar-background);
                    }
                    #chat {
                        flex-grow: 1;
                        overflow-y: auto;
                        padding: 5px 5px; /* 调整左右 padding 为更小的值 */
                        background-color: var(--vscode-sideBar-background);
                    }
                    .message {
                        padding: 5px;
                        border-radius: 5px;
                        margin-bottom: 5px;
                        background-color: var(--vscode-editor-background);
                    }
                    .message .username {
                        font-weight: bold;
                        font-size: calc(var(--vscode-editor-font-size) * 0.8);
                        color: var(--vscode-textLink-foreground);
                    }
                    .message .text {
                        margin-top: 5px;
                        font-size: var(--vscode-editor-font-size);
                        color: var(--vscode-foreground);
                    }

                    #inputArea {
                        display: flex;
                        align-items: center;
                        margin: 0 10px 15px 10px; /* 如果需要，调整间距 */
                        padding: 0;
                        background-color: var(--vscode-input-background);
                        border-radius: 4px; /* 圆角边框 */
                    }

                    #messageInput {
                        flex-grow: 1;
                        margin-right: 5px; /* 与发送按钮的间隔 */
                        padding: 0 15px;
                        border: none;
                        border-radius: 4px;
                        outline: none; /* 移除焦点时的轮廓 */
                        background-color: var(--vscode-input-background); /* 输入框背景颜色 */
                        color: var(--vscode-input-foreground); /* 输入框文字颜色 */
                    }

                    #sendButton {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0;
                        width: 40px; /* 确保按钮足够大以容纳图标 */
                        height: 40px;
                        background-color: var(--vscode-input-background);
                        border: none;
                        border-radius: 50%; /* 圆形按钮 */
                        cursor: pointer;
                        outline: none;
                    }

                    #sendButton svg {
                        fill: var(--vscode-button-foreground); /* 默认图标颜色 */
                        transition: fill 0.2s; /* 平滑颜色过渡效果 */
                    }

                    #sendButton:hover svg {
                        fill: var(--vscode-button-hoverForeground); /* 悬停时图标颜色 */
                    }
                </style>
            </head>
            <body>
                <div id="chat">
                    ${chatHtml}
                </div>
                <div id="inputArea">
                    <input type="text" id="messageInput" placeholder="Enter message"/>
                    <button id="sendButton">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                        </svg>
                    </button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const sendButton = document.getElementById('sendButton');
                    const sendIcon = sendButton.querySelector('svg');

					document.getElementById('messageInput').addEventListener('keypress', (event) => {
						if (event.key === 'Enter') {
							const message = document.getElementById('messageInput').value;
                            if (message === '') {
                               return;
                            }
							vscode.postMessage({
								command: 'send',
								text: message
							});
							document.getElementById('messageInput').value = ''; // 清空输入框
                            sendIcon.style.fill = 'var(--vscode-button-foreground)';
						}
					});
                    document.getElementById('sendButton').addEventListener('click', () => {
                        const message = document.getElementById('messageInput').value;
                        if (message === '') {
                            return;
                        }
                        vscode.postMessage({
                            command: 'send',
                            text: message
                        });
                        document.getElementById('messageInput').value = ''; // 清空输入框
                        sendIcon.style.fill = 'var(--vscode-button-foreground)';
                    });

                    document.getElementById('messageInput').addEventListener('input', () => {
                        if (messageInput.value.trim() !== '') {
                            // 输入内容非空时，改变图标颜色
                            sendIcon.style.fill = 'var(--vscode-textLink-foreground)';
                        } else {
                            // 输入内容为空时，恢复默认颜色
                            sendIcon.style.fill = 'var(--vscode-button-foreground)';
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data; // 接收的消息
                        if (message.command === 'receive') {
                            addReceivedMessageToChat(message.username, message.text);
                        }
                    });

                    function addReceivedMessageToChat(username, message) {
                        const chat = document.getElementById('chat');
                        const messageElement = document.createElement('div');
                        messageElement.classList.add('message');

                        const usernameElement = document.createElement('div');
                        usernameElement.classList.add('username');
                        usernameElement.textContent = username;

                        const textElement = document.createElement('div');
                        textElement.classList.add('text');
                        textElement.textContent = message;

                        messageElement.appendChild(usernameElement);
                        messageElement.appendChild(textElement);

                        chat.appendChild(messageElement);
                        chat.scrollTop = chat.scrollHeight;
                    }

                </script>
            </body>
            </html>`;
}