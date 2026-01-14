const vscode = require('vscode');
const { AppTreeProvider } = require('./appTreeProvider');
const ProjectTreeProvider = require('./projectTreeProvider');
const CategoryTreeProvider = require('./categoryTreeProvider');
const path = require('path');
const fs = require('fs');

let appTreeProvider;
let projectTreeProvider;
let categoryTreeProviders = {};

function activate(context) {

    // 프로젝트 선택 명령어 (먼저 등록)
    let selectProjectCommand = vscode.commands.registerCommand('wiz-extension.selectProject', async (projectInfo) => {
        // projectInfo가 객체인 경우 (Tree View에서 클릭)
        let projectPath;
        if (projectInfo && typeof projectInfo === 'object') {
            projectPath = projectInfo.projectPath;
        } else if (projectInfo && typeof projectInfo === 'string') {
            // 직접 경로가 전달된 경우
            projectPath = projectInfo;
        }

        if (projectPath) {
            if (appTreeProvider) {
                appTreeProvider.setSelectedProject(projectPath);
            }
            // 모든 Category Tree Provider에 선택된 프로젝트 설정 (이미 초기화된 경우에만)
            if (categoryTreeProviders && Object.keys(categoryTreeProviders).length > 0) {
                Object.values(categoryTreeProviders).forEach(provider => {
                    if (provider) {
                        provider.setSelectedProject(projectPath);
                    }
                });
            }
            vscode.commands.executeCommand('setContext', 'wiz.selectedProject', projectPath);
        }
    });

    // 기본적으로 main project 자동 선택 함수 (먼저 정의)
    const autoSelectMainProject = () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        for (const folder of workspaceFolders) {
            const workspaceRoot = folder.uri.fsPath;
            
            // WIZ 구조 찾기 (ProjectTreeProvider의 메서드 사용)
            if (!projectTreeProvider) {
                continue;
            }
            
            const wizRoot = projectTreeProvider.findWizRoot(workspaceRoot);
            if (!wizRoot) {
                continue;
            }

            const projectPath = path.join(wizRoot, 'project');
            if (!fs.existsSync(projectPath)) {
                continue;
            }

            // main project 찾기
            const mainProjectPath = path.join(projectPath, 'main');
            if (fs.existsSync(mainProjectPath)) {
                // main project 자동 선택
                if (appTreeProvider) {
                    appTreeProvider.setSelectedProject(mainProjectPath);
                }
                if (categoryTreeProviders && Object.keys(categoryTreeProviders).length > 0) {
                    Object.values(categoryTreeProviders).forEach(provider => {
                        if (provider) {
                            provider.setSelectedProject(mainProjectPath);
                        }
                    });
                }
                vscode.commands.executeCommand('setContext', 'wiz.selectedProject', mainProjectPath);
                break;
            }
        }
    };

    // 새로고침 명령어
    let refreshCommand = vscode.commands.registerCommand('wiz-extension.refresh', () => {
        // 프로젝트가 선택되지 않았으면 main project 자동 선택
        if (!appTreeProvider || !appTreeProvider.selectedProjectPath) {
            autoSelectMainProject();
        }
        
        if (appTreeProvider) {
            appTreeProvider.refresh();
        }
        if (projectTreeProvider) {
            projectTreeProvider.refresh();
        }
        if (categoryTreeProviders && Object.keys(categoryTreeProviders).length > 0) {
            Object.values(categoryTreeProviders).forEach(provider => {
                if (provider) {
                    provider.refresh();
                }
            });
        }
    });

    // Project Tree Provider 등록
    projectTreeProvider = new ProjectTreeProvider();
    vscode.window.registerTreeDataProvider('wizProjects', projectTreeProvider);

    // App Tree Provider 생성 (내부적으로 사용)
    appTreeProvider = new AppTreeProvider();

    // Category Tree Providers 등록
    const categoryViewMap = {
        'page': 'wizPage',
        'component': 'wizComponent',
        'layout': 'wizLayout',
        'angular': 'wizAngular',
        'assets': 'wizAssets',
        'controller': 'wizController',
        'model': 'wizModel',
        'route': 'wizRoute'
    };

    Object.entries(categoryViewMap).forEach(([category, viewId]) => {
        const provider = new CategoryTreeProvider(category);
        categoryTreeProviders[category] = provider;
        vscode.window.registerTreeDataProvider(viewId, provider);
    });

    // 기본적으로 main project 자동 선택 (모든 Provider 생성 후)
    autoSelectMainProject();

    // 구성요소 클릭 시 pug/html 파일만 열기
    let openComponentCommand = vscode.commands.registerCommand('wiz-extension.openComponent', async (component) => {
        // component가 객체인 경우 (Tree View에서 클릭)
        let folderPath, componentName;
        if (component && typeof component === 'object') {
            folderPath = component.folderPath;
            componentName = component.name;
        } else {
            // 직접 경로가 전달된 경우
            folderPath = component;
            componentName = path.basename(component);
        }

        if (!folderPath) {
            return;
        }

        const files = appTreeProvider.getComponentViewFiles(folderPath);
        
        if (files.length === 0) {
            vscode.window.showWarningMessage(`No view files found in ${componentName}`);
            return;
        }

        // pug 파일이 있으면 pug를, 없으면 html을 열기
        const fileToOpen = files.find(f => f.endsWith('.pug')) || files[0];
        
        try {
            const document = await vscode.workspace.openTextDocument(fileToOpen);
            await vscode.window.showTextDocument(document);
            
            // 상태 표시줄 업데이트
            updateStatusBar();
            
            // 활성화된 구성요소 경로 업데이트하여 하이라이팅
            appTreeProvider.setActiveComponentPath(folderPath);
        } catch (error) {
            console.error(`Failed to open ${fileToOpen}:`, error);
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
    });

    // Route 열기 명령어 (app.json 또는 controller.py 열기)
    let openRouteCommand = vscode.commands.registerCommand('wiz-extension.openRoute', async (route) => {
        const folderPath = route.folderPath;
        const routeName = route.name;
        
        // app.json이 있으면 app.json을, 없으면 controller.py를 열기
        const appJsonPath = path.join(folderPath, 'app.json');
        const controllerPyPath = path.join(folderPath, 'controller.py');
        
        let fileToOpen = null;
        if (fs.existsSync(appJsonPath)) {
            fileToOpen = appJsonPath;
        } else if (fs.existsSync(controllerPyPath)) {
            fileToOpen = controllerPyPath;
        }
        
        if (!fileToOpen) {
            vscode.window.showWarningMessage(`No route files found in ${routeName}`);
            return;
        }
        
        try {
            const document = await vscode.workspace.openTextDocument(fileToOpen);
            await vscode.window.showTextDocument(document, { preview: true });
            
            // 상태 표시줄 업데이트
            updateStatusBar();
            
            // 활성화된 route 경로 업데이트하여 하이라이팅
            if (categoryTreeProviders && categoryTreeProviders['route']) {
                categoryTreeProviders['route'].setActiveComponentPath(folderPath);
            }
            
            // 다른 category providers도 업데이트
            if (categoryTreeProviders) {
                Object.values(categoryTreeProviders).forEach(provider => {
                    if (provider && provider !== categoryTreeProviders['route']) {
                        provider.setActiveComponentPath(null);
                    }
                });
            }
        } catch (error) {
            console.error(`Failed to open route:`, error);
            vscode.window.showErrorMessage(`Failed to open route: ${error.message}`);
        }
    });

    // 구성요소의 다른 파일 열기
    let openComponentFileCommand = vscode.commands.registerCommand('wiz-extension.openComponentFile', async (fileInfo) => {
        if (!fileInfo || !fileInfo.path) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(fileInfo.path);
            await vscode.window.showTextDocument(document, { preview: false });
        } catch (error) {
            console.error(`Failed to open ${fileInfo.path}:`, error);
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
    });

    // 파일 타입별 기본 템플릿
    const getFileTemplate = (fileName, componentPath) => {
        const componentName = path.basename(componentPath);
        const componentInfo = appTreeProvider.getComponentInfo(componentPath);
        const title = componentInfo ? componentInfo.title : componentName;
        
        if (fileName === 'view.pug') {
            return `div ${title}`;
        } else if (fileName === 'view.html') {
            return `<div>${title}</div>`;
        } else if (fileName === 'view.ts') {
            return `import { OnInit, Input } from "@angular/core";
import { Service } from "@wiz/libs/portal/season/service";

export class Component implements OnInit {
    constructor(
        public service: Service,
    ) { }

    async ngOnInit() {
        await this.service.init();
        await this.service.auth.allow();
    }
}
`;
        } else if (fileName === 'view.scss') {
            return ``;
        } else if (fileName === 'api.py') {
            return ``;
        } else if (fileName === 'socket.py') {
            return ``;
        }
        return '';
    };

    // 파일 생성 명령어
    const createFileTypeCommand = (fileName, label, commandName) => {
        return vscode.commands.registerCommand(commandName, async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document) {
                return;
            }

            const filePath = activeEditor.document.uri.fsPath;
            const componentPath = appTreeProvider.findComponentPath(filePath);
            
            if (!componentPath) {
                vscode.window.showErrorMessage('Component path not found');
                return;
            }

            const targetPath = path.join(componentPath, fileName);
            
            // 파일이 이미 존재하면 열기
            if (fs.existsSync(targetPath)) {
                try {
                    const document = await vscode.workspace.openTextDocument(targetPath);
                    await vscode.window.showTextDocument(document, { 
                        preview: true,
                        viewColumn: vscode.ViewColumn.Active,
                        preserveFocus: false
                    });
                    updateStatusBar();
                } catch (error) {
                    console.error(`Failed to open ${targetPath}:`, error);
                    vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
                }
                return;
            }

            // 바로 파일 생성
            try {
                // 템플릿 가져오기
                const template = getFileTemplate(fileName, componentPath);
                
                // 파일 생성
                fs.writeFileSync(targetPath, template, 'utf8');
                
                // 파일 열기
                const document = await vscode.workspace.openTextDocument(targetPath);
                await vscode.window.showTextDocument(document, { 
                    preview: true,
                    viewColumn: vscode.ViewColumn.Active,
                    preserveFocus: false
                });
                
                // 컨텍스트 업데이트
                updateFileTypeContexts();
                updateStatusBar();
            } catch (error) {
                console.error(`Failed to create ${targetPath}:`, error);
                vscode.window.showErrorMessage(`파일 생성 실패: ${error.message}`);
            }
        });
    };

    // 특정 파일 타입 열기
    const createOpenFileTypeCommand = (fileName, label, commandName) => {
        return vscode.commands.registerCommand(commandName, async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document) {
                return;
            }

            const filePath = activeEditor.document.uri.fsPath;
            const componentPath = appTreeProvider.findComponentPath(filePath);
            
            if (!componentPath) {
                return;
            }

            const targetPath = path.join(componentPath, fileName);
            if (!fs.existsSync(targetPath)) {
                // 파일이 없으면 생성 명령어 실행
                const createCommandName = commandName.replace('open', 'create');
                await vscode.commands.executeCommand(createCommandName);
                return;
            }

            try {
                const document = await vscode.workspace.openTextDocument(targetPath);
                
                // 현재 활성 에디터 확인
                const activeEditor = vscode.window.activeTextEditor;
                
                // preview 탭이 있으면 현재 탭에서 열기, 없으면 새 탭
                // preview 탭은 보통 단일 클릭으로 열린 탭이며, 다른 파일을 열면 교체됨
                await vscode.window.showTextDocument(document, { 
                    preview: true,  // preview 모드로 열어서 기존 preview 탭을 교체
                    viewColumn: vscode.ViewColumn.Active,
                    preserveFocus: false
                });
                
                // 상태 표시줄 업데이트
                updateStatusBar();
            } catch (error) {
                console.error(`Failed to open ${targetPath}:`, error);
                vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
            }
        });
    };

    // 탭 변경 이벤트 모니터링하여 앱 정보 표시
    let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'wiz-extension.showComponentInfo';
    context.subscriptions.push(statusBarItem);

    const updateStatusBar = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document) {
            statusBarItem.hide();
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const componentPath = appTreeProvider.findComponentPath(filePath);
        
        if (!componentPath) {
            statusBarItem.hide();
            return;
        }

        const componentInfo = appTreeProvider.getComponentInfo(componentPath);
        if (componentInfo) {
            const displayText = componentInfo.projectName 
                ? `$(file-submodule) ${componentInfo.title} [${componentInfo.projectName}]`
                : `$(file-submodule) ${componentInfo.title}`;
            statusBarItem.text = displayText;
            statusBarItem.tooltip = `Component: ${componentInfo.name}\nPath: ${componentPath}`;
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    };

    // 구성요소 정보 표시 명령어
    let showComponentInfoCommand = vscode.commands.registerCommand('wiz-extension.showComponentInfo', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const componentPath = appTreeProvider.findComponentPath(filePath);
        
        if (!componentPath) {
            return;
        }

        const componentInfo = appTreeProvider.getComponentInfo(componentPath);
        if (componentInfo) {
            const message = `Component: ${componentInfo.title}\nName: ${componentInfo.name}${componentInfo.projectName ? `\nProject: ${componentInfo.projectName}` : ''}`;
            vscode.window.showInformationMessage(message);
        }
    });

    // 활성화된 버튼용 명령어 (동일한 동작, 다른 아이콘)
    const createActiveFileTypeCommand = (fileName, label, baseCommandName) => {
        // 활성화된 버튼도 동일한 동작을 수행
        return vscode.commands.registerCommand(`${baseCommandName}Active`, async () => {
            // 기본 명령어를 실행
            await vscode.commands.executeCommand(baseCommandName);
        });
    };

    // 파일 경로를 클립보드에 복사하는 명령어 (드래그&드롭 대체)
    const createCopyFilePathCommand = (fileName, label, baseCommandName) => {
        const copyCommandName = `${baseCommandName}CopyPath`;
        return vscode.commands.registerCommand(copyCommandName, async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document) {
                return;
            }

            const filePath = activeEditor.document.uri.fsPath;
            const componentPath = appTreeProvider.findComponentPath(filePath);
            
            if (!componentPath) {
                return;
            }

            const targetPath = path.join(componentPath, fileName);
            if (!fs.existsSync(targetPath)) {
                vscode.window.showWarningMessage(`${label} file not found`);
                return;
            }

            // 파일 경로를 클립보드에 복사
            await vscode.env.clipboard.writeText(targetPath);
            vscode.window.showInformationMessage(`Copied ${label} file path to clipboard`);
        });
    };

    // 파일 타입 간 이동 함수
    const navigateToFile = async (direction) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !activeEditor.document) {
            return;
        }

        const filePath = activeEditor.document.uri.fsPath;
        const fileName = path.basename(filePath);
        
        // route인지 확인
        let isRoute = false;
        let routePath = null;
        if (filePath.includes('/route/')) {
            const routeDir = path.dirname(filePath);
            const parentDir = path.dirname(routeDir);
            if (path.basename(parentDir) === 'route') {
                isRoute = true;
                routePath = routeDir;
            }
        }

        // app인지 확인
        const componentPath = appTreeProvider.findComponentPath(filePath);
        const isApp = componentPath !== null;

        if (!isApp && !isRoute) {
            return;
        }

        const basePath = isRoute ? routePath : componentPath;

        // 설정 확인
        const config = vscode.workspace.getConfiguration('wiz-extension');
        const buttonView = config.get('editorTitleButtonView', true);
        const buttonComponent = config.get('editorTitleButtonComponent', true);
        const buttonScss = config.get('editorTitleButtonScss', true);
        const buttonApi = config.get('editorTitleButtonApi', true);
        const buttonSocket = config.get('editorTitleButtonSocket', true);
        const buttonInfo = config.get('editorTitleButtonInfo', true);

        // 파일 타입 순서 정의
        // app: view, component, scss, api, socket (info 제외, 설정에서 enabled된 것만)
        // route: app.json, controller.py (info 포함)
        let fileTypes;
        if (isRoute) {
            fileTypes = [
                { name: 'app.json', check: () => fs.existsSync(path.join(basePath, 'app.json')) },
                { name: 'controller.py', check: () => fs.existsSync(path.join(basePath, 'controller.py')) }
            ];
        } else {
            fileTypes = [];
            
            // view (설정에서 enabled된 경우만)
            if (buttonView) {
                fileTypes.push({
                    name: 'view', 
                    check: () => {
                        const pugPath = path.join(basePath, 'view.pug');
                        const htmlPath = path.join(basePath, 'view.html');
                        return fs.existsSync(pugPath) || fs.existsSync(htmlPath);
                    },
                    getPath: () => {
                        const pugPath = path.join(basePath, 'view.pug');
                        const htmlPath = path.join(basePath, 'view.html');
                        return fs.existsSync(pugPath) ? pugPath : htmlPath;
                    }
                });
            }
            
            // view.ts (설정에서 enabled된 경우만)
            if (buttonComponent) {
                fileTypes.push({ name: 'view.ts', check: () => fs.existsSync(path.join(basePath, 'view.ts')) });
            }
            
            // view.scss (설정에서 enabled된 경우만)
            if (buttonScss) {
                fileTypes.push({ name: 'view.scss', check: () => fs.existsSync(path.join(basePath, 'view.scss')) });
            }
            
            // api.py (설정에서 enabled된 경우만)
            if (buttonApi) {
                fileTypes.push({ name: 'api.py', check: () => fs.existsSync(path.join(basePath, 'api.py')) });
            }
            
            // socket.py (설정에서 enabled된 경우만)
            if (buttonSocket) {
                fileTypes.push({ name: 'socket.py', check: () => fs.existsSync(path.join(basePath, 'socket.py')) });
            }
        }

        // 존재하는 파일만 필터링
        const availableFiles = fileTypes.filter(ft => ft.check());

        if (availableFiles.length === 0) {
            return;
        }

        // 현재 파일 타입 찾기
        let currentIndex = -1;
        if (isRoute) {
            // route의 경우 app.json 또는 controller.py
            if (fileName === 'app.json') {
                currentIndex = availableFiles.findIndex(ft => ft.name === 'app.json');
            } else if (fileName === 'controller.py') {
                currentIndex = availableFiles.findIndex(ft => ft.name === 'controller.py');
            }
        } else {
            // app의 경우
            if (fileName === 'view.pug' || fileName === 'view.html') {
                currentIndex = availableFiles.findIndex(ft => ft.name === 'view');
            } else if (fileName === 'app.json') {
                // app.json이 열려있으면 view로 취급 (info는 제외하므로)
                currentIndex = availableFiles.findIndex(ft => ft.name === 'view');
            } else {
                currentIndex = availableFiles.findIndex(ft => ft.name === fileName);
            }
        }

        if (currentIndex === -1) {
            return;
        }

        // 다음/이전 인덱스 계산
        let targetIndex;
        if (direction === 'next') {
            targetIndex = (currentIndex + 1) % availableFiles.length;
        } else {
            targetIndex = (currentIndex - 1 + availableFiles.length) % availableFiles.length;
        }

        const targetFile = availableFiles[targetIndex];
        let fileToOpen;
        
        if (targetFile.getPath) {
            fileToOpen = targetFile.getPath();
        } else {
            fileToOpen = path.join(basePath, targetFile.name);
        }

        if (!fs.existsSync(fileToOpen)) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(fileToOpen);
            await vscode.window.showTextDocument(document, { 
                preview: true,
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: false
            });
            
            updateStatusBar();
        } catch (error) {
            console.error(`Failed to open ${fileToOpen}:`, error);
        }
    };

    // 이전 파일로 이동 (opt+a)
    let navigatePreviousCommand = vscode.commands.registerCommand('wiz-extension.navigatePrevious', async () => {
        await navigateToFile('previous');
    });

    // 다음 파일로 이동 (opt+s)
    let navigateNextCommand = vscode.commands.registerCommand('wiz-extension.navigateNext', async () => {
        await navigateToFile('next');
    });

    // 현재 파일을 오른쪽에 분할 탭으로 열기 (opt+t)
    let openInSplitCommand = vscode.commands.registerCommand('wiz-extension.openInSplit', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !activeEditor.document) {
            return;
        }

        const document = activeEditor.document;
        
        try {
            await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.Beside,
                preview: true,
                preserveFocus: false
            });
        } catch (error) {
            console.error(`Failed to open file in split:`, error);
            vscode.window.showErrorMessage(`Failed to open file in split: ${error.message}`);
        }
    });

    // Route용 controller.py 열기 명령어
    const createOpenControllerPyCommand = (isActive) => {
        return vscode.commands.registerCommand(
            isActive ? 'wiz-extension.openControllerPyActive' : 'wiz-extension.openControllerPy',
            async () => {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor || !activeEditor.document) {
                    return;
                }

                const filePath = activeEditor.document.uri.fsPath;
                
                // route 파일인지 확인
                let routePath = null;
                if (filePath.includes('/route/')) {
                    const routeDir = path.dirname(filePath);
                    const parentDir = path.dirname(routeDir);
                    if (path.basename(parentDir) === 'route') {
                        routePath = routeDir;
                    }
                }
                
                if (!routePath) {
                    return;
                }

                const controllerPyPath = path.join(routePath, 'controller.py');
                
                if (!fs.existsSync(controllerPyPath)) {
                    vscode.window.showWarningMessage('Controller file not found');
                    return;
                }

                try {
                    const document = await vscode.workspace.openTextDocument(controllerPyPath);
                    await vscode.window.showTextDocument(document, { 
                        preview: true,
                        viewColumn: vscode.ViewColumn.Active,
                        preserveFocus: false
                    });
                    updateStatusBar();
                } catch (error) {
                    console.error(`Failed to open ${controllerPyPath}:`, error);
                    vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
                }
            }
        );
    };

    // Route용 app.json 열기 명령어
    const createOpenRouteAppJsonCommand = (isActive) => {
        return vscode.commands.registerCommand(
            isActive ? 'wiz-extension.openRouteAppJsonActive' : 'wiz-extension.openRouteAppJson',
            async () => {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor || !activeEditor.document) {
                    return;
                }

                const filePath = activeEditor.document.uri.fsPath;
                
                // route 파일인지 확인
                let routePath = null;
                if (filePath.includes('/route/')) {
                    const routeDir = path.dirname(filePath);
                    const parentDir = path.dirname(routeDir);
                    if (path.basename(parentDir) === 'route') {
                        routePath = routeDir;
                    }
                }
                
                if (!routePath) {
                    return;
                }

                const appJsonPath = path.join(routePath, 'app.json');
                
                if (!fs.existsSync(appJsonPath)) {
                    vscode.window.showWarningMessage('App.json file not found');
                    return;
                }

                try {
                    const document = await vscode.workspace.openTextDocument(appJsonPath);
                    await vscode.window.showTextDocument(document, { 
                        preview: true,
                        viewColumn: vscode.ViewColumn.Active,
                        preserveFocus: false
                    });
                    updateStatusBar();
                } catch (error) {
                    console.error(`Failed to open ${appJsonPath}:`, error);
                    vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
                }
            }
        );
    };

    let openControllerPyCommand = createOpenControllerPyCommand(false);
    let openControllerPyActiveCommand = createOpenControllerPyCommand(true);
    let openRouteAppJsonCommand = createOpenRouteAppJsonCommand(false);
    let openRouteAppJsonActiveCommand = createOpenRouteAppJsonCommand(true);

    // 각 파일 타입별 명령어 생성
    const fileTypeCommands = [
        { fileName: 'view.pug', label: 'View', command: 'wiz-extension.openViewPug' },
        { fileName: 'view.html', label: 'View', command: 'wiz-extension.openViewHtml' },
        { fileName: 'view.ts', label: 'Component', command: 'wiz-extension.openViewTs' },
        { fileName: 'view.scss', label: 'SCSS', command: 'wiz-extension.openViewScss' },
        { fileName: 'api.py', label: 'API', command: 'wiz-extension.openApiPy' },
        { fileName: 'socket.py', label: 'Socket', command: 'wiz-extension.openSocketPy' },
        { fileName: 'app.json', label: 'Info', command: 'wiz-extension.openAppJson' }
    ];

    const fileTypeCommandHandlers = fileTypeCommands.map(({ fileName, label, command }) => {
        const baseHandler = createOpenFileTypeCommand(fileName, label, command);
        const activeHandler = createActiveFileTypeCommand(fileName, label, command);
        const copyHandler = createCopyFilePathCommand(fileName, label, command);
        // 파일 생성 명령어 추가 (app.json 제외)
        if (fileName !== 'app.json') {
            const createCommand = command.replace('open', 'create');
            const createHandler = createFileTypeCommand(fileName, label, createCommand);
            return [baseHandler, activeHandler, copyHandler, createHandler];
        }
        return [baseHandler, activeHandler, copyHandler];
    }).flat();



    // 뷰 포커스 명령어
    let focusViewCommand = vscode.commands.registerCommand('wiz-extension.focusView', async () => {
        await vscode.commands.executeCommand('workbench.view.wiz');
        // 뷰가 표시되도록 트리 새로고침
        if (appTreeProvider) {
            appTreeProvider.refresh();
        }
    });

    // 워크스페이스 변경 감지
    let workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        appTreeProvider.refresh();
    });

    // 에디터 변경 감지하여 버튼 표시 여부 업데이트
    const updateComponentContext = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.commands.executeCommand('setContext', 'wiz.hasComponent', false);
            appTreeProvider.setActiveComponentPath(null);
            // 모든 Category Tree Provider에도 업데이트
            ['page', 'component', 'layout'].forEach(category => {
                if (categoryTreeProviders[category]) {
                    categoryTreeProviders[category].setActiveComponentPath(null);
                }
            });
            return;
        }
        const filePath = editor.document.uri.fsPath;
        const componentPath = appTreeProvider.findComponentPath(filePath);
        
        // route 파일인지 확인 (controller.py, app.json이 route 디렉토리에 있는지)
        let routePath = null;
        if (filePath.includes('/route/')) {
            const routeDir = path.dirname(filePath);
            const parentDir = path.dirname(routeDir);
            if (path.basename(parentDir) === 'route') {
                routePath = routeDir;
            }
        }
        
        const hasComponent = componentPath !== null || routePath !== null;
        vscode.commands.executeCommand('setContext', 'wiz.hasComponent', hasComponent);
        
        // 활성화된 구성요소 경로 업데이트
        if (componentPath) {
            appTreeProvider.setActiveComponentPath(componentPath);
            // page, component, layout Category Tree Provider에도 업데이트
            ['page', 'component', 'layout'].forEach(category => {
                if (categoryTreeProviders[category]) {
                    categoryTreeProviders[category].setActiveComponentPath(componentPath);
                }
            });
            // route는 null로 설정
            if (categoryTreeProviders && categoryTreeProviders['route']) {
                categoryTreeProviders['route'].setActiveComponentPath(null);
            }
        } else if (routePath) {
            // route인 경우
            appTreeProvider.setActiveComponentPath(null);
            if (categoryTreeProviders && categoryTreeProviders['route']) {
                categoryTreeProviders['route'].setActiveComponentPath(routePath);
            }
            // 다른 category providers는 null로 설정
            ['page', 'component', 'layout'].forEach(category => {
                if (categoryTreeProviders[category]) {
                    categoryTreeProviders[category].setActiveComponentPath(null);
                }
            });
        } else {
            appTreeProvider.setActiveComponentPath(null);
            // 모든 category providers도 null로 설정
            if (categoryTreeProviders) {
                Object.values(categoryTreeProviders).forEach(provider => {
                    if (provider) {
                        provider.setActiveComponentPath(null);
                    }
                });
            }
        }
    };

    let activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor(updateComponentContext);
    
    // 설정 변경 감지하여 context 업데이트
    const updateButtonContexts = () => {
        const config = vscode.workspace.getConfiguration('wiz-extension');
        
        // 각 버튼의 활성화 상태를 context로 설정
        vscode.commands.executeCommand('setContext', 'wiz.buttonView', config.get('editorTitleButtonView', true));
        vscode.commands.executeCommand('setContext', 'wiz.buttonComponent', config.get('editorTitleButtonComponent', true));
        vscode.commands.executeCommand('setContext', 'wiz.buttonScss', config.get('editorTitleButtonScss', true));
        vscode.commands.executeCommand('setContext', 'wiz.buttonApi', config.get('editorTitleButtonApi', true));
        vscode.commands.executeCommand('setContext', 'wiz.buttonSocket', config.get('editorTitleButtonSocket', true));
        vscode.commands.executeCommand('setContext', 'wiz.buttonInfo', config.get('editorTitleButtonInfo', true));
    };
    
    // 설정 변경 감지
    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('wiz-extension.editorTitleButton')) {
            updateButtonContexts();
        }
    });
    
    // 초기 상태 설정
    updateComponentContext();
    updateButtonContexts();

    // 에디터 변경 시 각 파일 타입 존재 여부 및 활성화 상태 업데이트
    const getContextName = (fileName) => {
        return `wiz.has${fileName.replace(/\./g, '').toLowerCase()}`;
    };

    const getActiveContextName = (fileName) => {
        return `wiz.active${fileName.replace(/\./g, '').toLowerCase()}`;
    };

    // 현재 활성 파일의 타입 감지
    const getActiveFileType = (filePath) => {
        const fileName = path.basename(filePath);
        // 정확한 파일명 매칭
        for (const { fileName: typeFileName } of fileTypeCommands) {
            if (fileName === typeFileName) {
                return typeFileName;
            }
        }
        // Route 파일 타입도 확인
        if (fileName === 'controller.py' || fileName === 'app.json') {
            // route 디렉토리에 있는지 확인
            if (filePath.includes('/route/')) {
                const routeDir = path.dirname(filePath);
                const parentDir = path.dirname(routeDir);
                if (path.basename(parentDir) === 'route') {
                    return fileName;
                }
            }
        }
        return null;
    };

    const getMissingContextName = (fileName) => {
        return `wiz.missing${fileName.replace(/\./g, '').toLowerCase()}`;
    };

    const updateFileTypeContexts = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            fileTypeCommands.forEach(({ fileName }) => {
                vscode.commands.executeCommand('setContext', getContextName(fileName), false);
                vscode.commands.executeCommand('setContext', getActiveContextName(fileName), false);
                vscode.commands.executeCommand('setContext', getMissingContextName(fileName), false);
            });
            // Route 컨텍스트 초기화
            vscode.commands.executeCommand('setContext', 'wiz.hasRoute', false);
            vscode.commands.executeCommand('setContext', 'wiz.hascontrollerpy', false);
            vscode.commands.executeCommand('setContext', 'wiz.activecontrollerpy', false);
            vscode.commands.executeCommand('setContext', 'wiz.missingcontrollerpy', false);
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const componentPath = appTreeProvider.findComponentPath(filePath);
        
        // route 파일인지 확인
        let routePath = null;
        if (filePath.includes('/route/')) {
            const routeDir = path.dirname(filePath);
            const parentDir = path.dirname(routeDir);
            if (path.basename(parentDir) === 'route') {
                routePath = routeDir;
            }
        }
        
        const activeFileType = getActiveFileType(filePath);
        
        // Route인 경우
        if (routePath) {
            vscode.commands.executeCommand('setContext', 'wiz.hasRoute', true);
            
            // Route 파일 타입 컨텍스트 설정
            const appJsonPath = path.join(routePath, 'app.json');
            const controllerPyPath = path.join(routePath, 'controller.py');
            
            const hasAppJson = fs.existsSync(appJsonPath);
            const hasControllerPy = fs.existsSync(controllerPyPath);
            const isActiveController = activeFileType === 'controller.py';
            const isActiveAppJson = activeFileType === 'app.json';
            
            vscode.commands.executeCommand('setContext', 'wiz.hasappjson', hasAppJson);
            vscode.commands.executeCommand('setContext', 'wiz.activeappjson', isActiveAppJson);
            vscode.commands.executeCommand('setContext', 'wiz.hascontrollerpy', hasControllerPy);
            vscode.commands.executeCommand('setContext', 'wiz.activecontrollerpy', isActiveController);
            vscode.commands.executeCommand('setContext', 'wiz.missingcontrollerpy', !hasControllerPy && !isActiveController);
            
            // App 파일 타입 컨텍스트는 false로 설정
            fileTypeCommands.forEach(({ fileName }) => {
                if (fileName !== 'app.json') {
                    vscode.commands.executeCommand('setContext', getContextName(fileName), false);
                    vscode.commands.executeCommand('setContext', getActiveContextName(fileName), false);
                    vscode.commands.executeCommand('setContext', getMissingContextName(fileName), false);
                }
            });
            return;
        }
        
        if (!componentPath) {
            fileTypeCommands.forEach(({ fileName }) => {
                vscode.commands.executeCommand('setContext', getContextName(fileName), false);
                vscode.commands.executeCommand('setContext', getActiveContextName(fileName), false);
                vscode.commands.executeCommand('setContext', getMissingContextName(fileName), false);
            });
            // Route 컨텍스트 초기화
            vscode.commands.executeCommand('setContext', 'wiz.hasRoute', false);
            vscode.commands.executeCommand('setContext', 'wiz.hascontrollerpy', false);
            vscode.commands.executeCommand('setContext', 'wiz.activecontrollerpy', false);
            vscode.commands.executeCommand('setContext', 'wiz.missingcontrollerpy', false);
            return;
        }

        // App인 경우
        vscode.commands.executeCommand('setContext', 'wiz.hasRoute', false);
        vscode.commands.executeCommand('setContext', 'wiz.hascontrollerpy', false);
        vscode.commands.executeCommand('setContext', 'wiz.activecontrollerpy', false);
        vscode.commands.executeCommand('setContext', 'wiz.missingcontrollerpy', false);

        fileTypeCommands.forEach(({ fileName }) => {
            const targetPath = path.join(componentPath, fileName);
            const exists = fs.existsSync(targetPath);
            const isActive = activeFileType === fileName;
            
            // view.pug와 view.html은 특별 처리
            let missing = false;
            if (fileName === 'view.pug' || fileName === 'view.html') {
                const pugPath = path.join(componentPath, 'view.pug');
                const htmlPath = path.join(componentPath, 'view.html');
                const hasPug = fs.existsSync(pugPath);
                const hasHtml = fs.existsSync(htmlPath);
                
                if (fileName === 'view.pug') {
                    missing = !hasPug && !hasHtml && !isActive;
                } else if (fileName === 'view.html') {
                    missing = !hasPug && !hasHtml && !isActive;
                }
            } else {
                missing = !exists && !isActive;
            }
            
            vscode.commands.executeCommand('setContext', getContextName(fileName), exists);
            vscode.commands.executeCommand('setContext', getActiveContextName(fileName), isActive);
            vscode.commands.executeCommand('setContext', getMissingContextName(fileName), missing);
        });
    };

    let activeEditorWatcherWithFileTypes = vscode.window.onDidChangeActiveTextEditor(() => {
        updateComponentContext();
        updateFileTypeContexts();
        updateStatusBar();
        // Tree View 새로고침하여 하이라이팅 업데이트
        appTreeProvider.refresh();
    });

    // 초기 상태 설정
    updateFileTypeContexts();

    // 초기 상태 표시줄 업데이트
    updateStatusBar();

    // 기본적으로 main project 자동 선택
    autoSelectMainProject();

    context.subscriptions.push(
        openComponentCommand,
        openRouteCommand,
        openControllerPyCommand,
        openControllerPyActiveCommand,
        openRouteAppJsonCommand,
        openRouteAppJsonActiveCommand,
        openComponentFileCommand,
        showComponentInfoCommand,
        selectProjectCommand,
        refreshCommand,
        focusViewCommand,
        navigatePreviousCommand,
        navigateNextCommand,
        openInSplitCommand,
        workspaceWatcher,
        activeEditorWatcherWithFileTypes,
        configWatcher,
        ...fileTypeCommandHandlers
    );
}

function deactivate() {
    appTreeProvider = null;
}

module.exports = {
    activate,
    deactivate
};
