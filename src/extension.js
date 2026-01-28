const vscode = require('vscode');
const { AppTreeProvider } = require('./appTreeProvider');
const ProjectTreeProvider = require('./projectTreeProvider');
const CategoryTreeProvider = require('./categoryTreeProvider');
const path = require('path');
const fs = require('fs');

let appTreeProvider;
let projectTreeProvider;
let categoryTreeProviders = {};

const appJsonTemplate = {
  page: {
    "mode": "page", // page 고정
    "namespace": "main", // 입력받아야 함. 필수값. 영어 소문자와 dot(.) 만 허용.
    "id": "page.main", // namespace에 따라 page.{namespace} 형태 자동 생성
    "title": "Main Page", // 입력받아야 함. 생략 시 namespace값으로 자동 부여
    "viewuri": "/main/:id?", // 입력받아야 함. 필수값. Angular Route Path 형태로 입력.
    "layout": "layout.navbar", // app layouts 목록에서 선택. 필수 선택.
    "controller": "", // server controller 목록에서 선택. 빈 값(null) 선택 가능
    "ng.build": {
      "id": "page.main", // namespace에 따라 page.{namespace} 형태 자동 생성
      "name": "PageMainComponent", // id값을 dot(.)으로 split한 뒤 첫 번째 값을 대문자로 변환하여 생성, 뒤에 Component 추가
      "path": "./page.main/page.main.component" // ./{id}/{id}.component 형태 자동 생성
    },
    "ng": {
      "selector": "wiz-page-main", // wiz-page-{namespace} 형태 자동 생성. namespace에 dot(.)이 있으면 -로 변환.
      "inputs": [], // 고정
      "outputs": [] // 고정
    },
    "template": "wiz-page-main()" // ng.selector 생성 후 template engine이 pug일 시 {ng.selector}() 형태로 자동 생성. html일 시 <{ng.selector} /> 형태로 자동 생성.
  },
  component: {
    "mode": "component", // component 고정
    "namespace": "card", // 입력받아야 함. 필수값. 영어 소문자와 dot(.) 만 허용.
    "id": "component.card", // namespace에 따라 component.{namespace} �形태 자동 생성
    "title": "Card", // 입력받아야 함. 생략 시 namespace값으로 자동 부여
    "controller": "", // server controller 목록에서 선택. 빈 값(null) 선택 가능
    "ng.build": {
      "id": "component.card",
      "name": "ComponentCardComponent", // id값을 dot(.)으로 split한 뒤 첫 번째 값을 대문자로 변환하여 생성, 뒤에 Component 추가
      "path": "./component.card/component.card.component" // ./{id}/{id}.component 형태 자동 생성
    },
    "ng": {
      "selector": "wiz-component-card", // wiz-component-{namespace} 형태 자동 생성. namespace에 dot(.)이 있으면 -로 변환.
      "inputs": [],
      "outputs": []
    },
    "template": "wiz-component-card()" // ng.selector 생성 후 template engine이 pug일 시 {ng.selector}() 형태로 자동 생성. html일 시 <{ng.selector} /> 형태로 자동 생성.
  },
  layout: {
    "mode": "layout", // layout 고정
    "namespace": "navbar", // 입력받아야 함. 필수값. 영어 소문자와 dot(.) 만 허용.
    "id": "layout.navbar", // namespace에 따라 layout.{namespace} 형태 자동 생성
    "title": "navbar", // 입력받아야 함. 생략 시 namespace값으로 자동 부여
    "controller": "", // server controller 목록에서 선택. 빈 값(null) 선택 가능
    "ng.build": {
      "id": "layout.navbar",
      "name": "LayoutNavbarComponent", // id값을 dot(.)으로 split한 뒤 첫 번째 값을 대문자로 변환하여 생성, 뒤에 Component 추가
      "path": "./layout.navbar/layout.navbar.component" // ./{id}/{id}.component 형태 자동 생성
    },
    "ng": {
      "selector": "wiz-layout-navbar", // wiz-layout-{namespace} 형태 자동 생성. namespace에 dot(.)이 있으면 -로 변환.
      "inputs": [],
      "outputs": []
    },
    "template": "wiz-layout-navbar()" // ng.selector 생성 후 template engine이 pug일 시 {ng.selector}() 형태로 자동 생성. html일 시 <{ng.selector} /> 형태로 자동 생성.
  },
  route: {
    "id": "test", // 입력받아야 함. 필수값. 영어 소문자와 dot(.) 만 허용.
    "title": "test", // 입력받아야 함. 생략 시 id값으로 자동 부여
    "route": "/test", // 입력받아야 함. 필수값. Flask Route Path 형태로 입력.
    "controller": "base" // server controller 목록에서 선택. 빈 값(null) 선택 가능
  },
  "portal.component": {
    "type": "app", // app 고정
    "mode": "portal", // portal 고정
    "namespace": "test", // 입력받아야 함. 필수값. 영어 소문자와 dot(.) 만 허용.
    "id": "test", // namespace와 같은 값으로 자동 생성
    "title": "Test", // 입력받아야 함. 생략 시 namespace값으로 자동 부여
    "viewuri": "",
    "category": "",
    "controller": "", // server controller 목록에서 선택. 빈 값(null) 선택 가능
    "template": "wiz-portal-modulename-test()", // wiz-portal-{module_name}-{namespace} 형태 자동 생성. namespace에 dot(.)이 있으면 -로 변환. html일 시 <wiz-portal-{module_name}-{namespace} /> 형태로 자동 생성. pug일 시 wiz-portal-{module_name}-{namespace}() 형태로 자동 생성.
  },
  "portal.widget": {
    "type": "widget", // widget 고정
    "mode": "portal", // portal 고정
    "namespace": "widget.test", // 입력받아야 함. 필수값. 영어 소문자와 dot(.) 만 허용. 입력 받은 값 앞에 "widget." 자동 추가
    "id": "widget.test", // namespace와 같은 값으로 자동 생성
    "title": "Widget Test", // 입력받아야 함. 생략 시 namespace값으로 자동 부여
    "viewuri": "",
    "category": "",
    "controller": "", // server controller 목록에서 선택. 빈 값(null) 선택 가능
    "template": "wiz-portal-modulename-test()", // wiz-portal-{module_name}-{namespace} 형태 자동 생성. namespace에 dot(.)이 있으면 -로 변환. html일 시 <wiz-portal-{module_name}-{namespace} /> 형태로 자동 생성. pug일 시 wiz-portal-{module_name}-{namespace}() 형태로 자동 생성.
  },
};

function activate(context) {
  // 프로젝트 상태 표시줄 아이템
  let projectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200);
  projectStatusBarItem.command = 'wiz-extension.selectProject';
  projectStatusBarItem.tooltip = 'Click to select project';
  context.subscriptions.push(projectStatusBarItem);

  // 프로젝트 상태 표시줄 업데이트
  const updateProjectStatusBar = () => {
    const projectPath = appTreeProvider ? appTreeProvider.selectedProjectPath : null;
    if (projectPath) {
      const projectName = path.basename(projectPath);
      projectStatusBarItem.text = `$(folder) Project: ${projectName}`;
      projectStatusBarItem.tooltip = `Current project: ${projectName}\nPath: ${projectPath}\nClick to change project`;
      projectStatusBarItem.show();
    } else {
      projectStatusBarItem.text = `$(folder) Project: None`;
      projectStatusBarItem.tooltip = 'No project selected\nClick to select project';
      projectStatusBarItem.show();
    }
  };

  // 프로젝트 선택 함수 (공통 로직)
  const selectProject = (projectPath) => {
    if (projectPath) {
      if (appTreeProvider) {
        appTreeProvider.setSelectedProject(projectPath);
      }
      // 모든 Category Tree Provider에 선택된 프로젝트 설정
      if (categoryTreeProviders && Object.keys(categoryTreeProviders).length > 0) {
        Object.values(categoryTreeProviders).forEach(provider => {
          if (provider) {
            provider.setSelectedProject(projectPath);
          }
        });
      }
      vscode.commands.executeCommand('setContext', 'wiz.selectedProject', projectPath);
      // 상태 표시줄 업데이트
      updateProjectStatusBar();
    }
  };

  // 프로젝트 선택 명령어 (커맨드 팔레트용)
  let selectProjectCommand = vscode.commands.registerCommand('wiz-extension.selectProject', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }

    // projectTreeProvider가 없으면 임시로 생성하여 사용
    let tempProvider = projectTreeProvider;
    if (!tempProvider) {
      tempProvider = new ProjectTreeProvider();
    }

    const projects = [];
    for (const folder of workspaceFolders) {
      const workspaceRoot = folder.uri.fsPath;

      // WIZ 구조 찾기
      const wizRoot = tempProvider.findWizRoot(workspaceRoot);
      if (!wizRoot) {
        continue;
      }

      const projectPath = path.join(wizRoot, 'project');
      if (!fs.existsSync(projectPath)) {
        continue;
      }

      try {
        const entries = fs.readdirSync(projectPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const projectDirPath = path.join(projectPath, entry.name);
            projects.push({
              label: entry.name,
              description: projectDirPath,
              projectPath: projectDirPath
            });
          }
        }
      } catch (error) {
        console.error(`Error reading ${projectPath}:`, error);
      }
    }

    if (projects.length === 0) {
      vscode.window.showErrorMessage('No projects found.');
      return;
    }

    // 현재 선택된 프로젝트 표시
    const currentProjectPath = appTreeProvider ? appTreeProvider.selectedProjectPath : null;
    const items = projects.map(p => {
      const isSelected = currentProjectPath && path.normalize(p.projectPath) === path.normalize(currentProjectPath);
      return {
        ...p,
        label: isSelected ? `$(check) ${p.label}` : p.label,
        picked: isSelected
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a project',
      ignoreFocusOut: true
    });

    if (selected) {
      selectProject(selected.projectPath);
      vscode.window.showInformationMessage(`Project "${selected.label}" selected.`);
    }
  });

  // 기본적으로 main project 자동 선택 함수 (먼저 정의)
  const autoSelectMainProject = () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    // projectTreeProvider가 없으면 임시로 생성하여 사용
    let tempProvider = projectTreeProvider;
    if (!tempProvider) {
      tempProvider = new ProjectTreeProvider();
    }

    for (const folder of workspaceFolders) {
      const workspaceRoot = folder.uri.fsPath;

      // WIZ 구조 찾기
      const wizRoot = tempProvider.findWizRoot(workspaceRoot);
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
        selectProject(mainProjectPath);
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

  // Project Tree Provider 생성 (뷰 등록은 하지 않음, 프로젝트 목록 조회용으로만 사용)
  projectTreeProvider = new ProjectTreeProvider();

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
    
    // assets의 경우 드래그&드롭 지원을 위해 TreeView 사용
    if (category === 'assets') {
      const treeView = vscode.window.createTreeView(viewId, {
        treeDataProvider: provider,
        dragAndDropController: {
          dragMimeTypes: ['application/vnd.code.tree.wizAssets', 'text/uri-list'],
          dropMimeTypes: ['application/vnd.code.tree.wizAssets', 'text/uri-list'],
          handleDrag: (source, dataTransfer, token) => {
            if (source && source.length > 0) {
              const items = source.map(item => {
                if (item.filePath) {
                  return vscode.Uri.file(item.filePath).toString();
                }
                return null;
              }).filter(Boolean);
              
              if (items.length > 0) {
                dataTransfer.set('application/vnd.code.tree.wizAssets', new vscode.DataTransferItem(JSON.stringify(items)));
                dataTransfer.set('text/uri-list', new vscode.DataTransferItem(items.join('\n')));
              }
            }
          },
          handleDrop: async (target, dataTransfer, token) => {
            const projectPath = provider.selectedProjectPath;
            if (!projectPath) {
              vscode.window.showErrorMessage('Please select a project first.');
              return;
            }

            const srcPath = path.join(projectPath, 'src');
            const assetsPath = path.join(srcPath, 'assets');

            // assets 디렉토리가 없으면 생성
            if (!fs.existsSync(assetsPath)) {
              fs.mkdirSync(assetsPath, { recursive: true });
            }

            // 타겟 경로 결정
            let targetPath = assetsPath;
            if (target && target.filePath) {
              const stat = fs.statSync(target.filePath);
              if (stat.isDirectory()) {
                targetPath = target.filePath;
              } else {
                targetPath = path.dirname(target.filePath);
              }
            }

            try {
              // URI 리스트에서 파일 경로 추출
              const uriList = dataTransfer.get('text/uri-list');
              if (uriList) {
                const uris = uriList.value.split('\n').filter(Boolean);
                
                for (const uriString of uris) {
                  try {
                    const uri = vscode.Uri.parse(uriString);
                    let sourcePath;
                    
                    // 파일 시스템 URI인 경우
                    if (uri.scheme === 'file') {
                      sourcePath = uri.fsPath;
                    } else {
                      // 외부에서 드롭된 파일 (예: Finder에서)
                      continue;
                    }

                    if (!fs.existsSync(sourcePath)) {
                      continue;
                    }

                    const fileName = path.basename(sourcePath);
                    const destPath = path.join(targetPath, fileName);

                    // 같은 위치로 이동하는 경우 스킵
                    if (path.normalize(sourcePath) === path.normalize(destPath)) {
                      continue;
                    }

                    // 중복 파일 확인
                    if (fs.existsSync(destPath)) {
                      const overwrite = await vscode.window.showWarningMessage(
                        `File "${fileName}" already exists. Overwrite?`,
                        { modal: true },
                        'Overwrite',
                        'Skip'
                      );

                      if (overwrite !== 'Overwrite') {
                        continue;
                      }
                    }

                    // 파일 또는 디렉토리 복사
                    const stat = fs.statSync(sourcePath);
                    if (stat.isDirectory()) {
                      // 디렉토리 복사
                      fs.cpSync(sourcePath, destPath, { recursive: true });
                    } else {
                      // 파일 복사
                      fs.copyFileSync(sourcePath, destPath);
                    }

                    // 소스가 assets 내부에 있으면 원본 삭제 (이동)
                    if (sourcePath.startsWith(assetsPath)) {
                      if (stat.isDirectory()) {
                        fs.rmSync(sourcePath, { recursive: true, force: true });
                      } else {
                        fs.unlinkSync(sourcePath);
                      }
                    }
                  } catch (error) {
                    console.error(`Failed to handle drop for ${uriString}:`, error);
                  }
                }

                // Tree View 새로고침
                provider.refresh();
                vscode.window.showInformationMessage('Files moved/uploaded successfully.');
              }
            } catch (error) {
              console.error(`Failed to handle drop:`, error);
              vscode.window.showErrorMessage(`Failed to handle drop: ${error.message}`);
            }
          }
        }
      });
      context.subscriptions.push(treeView);
    } else {
      vscode.window.registerTreeDataProvider(viewId, provider);
    }
  });

  // 기본적으로 main project 자동 선택 (모든 Provider 생성 후)
  autoSelectMainProject();

  // 초기 프로젝트 상태 표시줄 업데이트 (autoSelectMainProject 후에 호출)
  setTimeout(() => {
    updateProjectStatusBar();
  }, 100);

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

    let files = appTreeProvider.getComponentViewFiles(folderPath);

    // view 파일이 없으면 자동으로 생성
    if (files.length === 0) {
      try {
        // 프로젝트 경로에서 template 타입 확인 (html / pug)
        const projectPath = appTreeProvider ? appTreeProvider.selectedProjectPath : null;
        const templateType = projectPath ? getTemplateType(projectPath) : 'pug';
        const viewFileName = templateType === 'html' ? 'view.html' : 'view.pug';
        const targetPath = path.join(folderPath, viewFileName);

        // 기본 템플릿 생성
        const template = getFileTemplate(viewFileName, folderPath);
        fs.writeFileSync(targetPath, template, 'utf8');

        // 파일 목록 갱신
        files = [targetPath];

        // 컨텍스트 업데이트 (버튼/단축키 상태 반영)
        if (typeof updateFileTypeContexts === 'function') {
          updateFileTypeContexts();
        }
      } catch (error) {
        console.error(`Failed to create view file in ${folderPath}:`, error);
        vscode.window.showErrorMessage(`Failed to create view file: ${error.message}`);
        return;
      }
    }

    // pug 파일이 있으면 pug를, 없으면 첫 번째 파일 열기
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

  // Route 열기 명령어 (controller.py 우선, 없으면 app.json)
  let openRouteCommand = vscode.commands.registerCommand('wiz-extension.openRoute', async (route) => {
    const folderPath = route.folderPath;
    const routeName = route.name;

    // controller.py가 있으면 controller.py를, 없으면 app.json을 열기
    const appJsonPath = path.join(folderPath, 'app.json');
    const controllerPyPath = path.join(folderPath, 'controller.py');

    let fileToOpen = null;
    if (fs.existsSync(controllerPyPath)) {
      fileToOpen = controllerPyPath;
    } else if (fs.existsSync(appJsonPath)) {
      fileToOpen = appJsonPath;
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

  // 삭제 명령어 (App Component)
  let deleteAppComponentCommand = vscode.commands.registerCommand('wiz-extension.deleteAppComponent', async (component) => {
    let folderPath, componentName;
    if (component && typeof component === 'object') {
      folderPath = component.folderPath;
      componentName = component.name;
    } else if (component && typeof component === 'string') {
      folderPath = component;
      componentName = path.basename(component);
    }

    // path가 없으면 목록에서 선택
    if (!folderPath) {
      // 프로젝트 확인
      let projectPath = appTreeProvider ? appTreeProvider.selectedProjectPath : null;
      if (!projectPath) {
        await vscode.commands.executeCommand('wiz-extension.selectProject');
        projectPath = appTreeProvider ? appTreeProvider.selectedProjectPath : null;
        if (!projectPath) {
          vscode.window.showErrorMessage('Please select a project first.');
          return;
        }
      }

      const srcPath = path.join(projectPath, 'src');

      // 모든 app components 목록 가져오기 (기본 + portal framework)
      const components = [];

      // 1) 기본 src/app
      const appPath = path.join(srcPath, 'app');
      if (fs.existsSync(appPath)) {
        try {
          const entries = fs.readdirSync(appPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('__')) {
              const componentPath = path.join(appPath, entry.name);
              const appJsonPath = path.join(componentPath, 'app.json');
              if (fs.existsSync(appJsonPath)) {
                try {
                  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                  components.push({
                    label: entry.name,
                    description: appJson.title || entry.name,
                    folderPath: componentPath
                  });
                } catch (e) {
                  components.push({
                    label: entry.name,
                    description: entry.name,
                    folderPath: componentPath
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error reading ${appPath}:`, error);
          vscode.window.showErrorMessage(`Failed to read app directory: ${error.message}`);
          return;
        }
      }

      // 2) portal framework: src/portal/[module]/app, src/portal/[module]/widget
      const portalRoot = path.join(srcPath, 'portal');
      if (fs.existsSync(portalRoot)) {
        try {
          const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
          for (const portalEntry of portalEntries) {
            if (!portalEntry.isDirectory() || portalEntry.name.startsWith('__')) continue;
            const moduleName = portalEntry.name;
            const modulePath = path.join(portalRoot, moduleName);
            const prefix = `[${moduleName}]`;

            const portalAppPath = path.join(modulePath, 'app');
            if (fs.existsSync(portalAppPath)) {
              try {
                const entries = fs.readdirSync(portalAppPath, { withFileTypes: true });
                for (const entry of entries) {
                  if (entry.isDirectory() && !entry.name.startsWith('__')) {
                    const componentPath = path.join(portalAppPath, entry.name);
                    const appJsonPath = path.join(componentPath, 'app.json');
                    if (fs.existsSync(appJsonPath)) {
                      try {
                        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                        components.push({
                          label: `${prefix} ${entry.name}`,
                          description: appJson.title || entry.name,
                          folderPath: componentPath
                        });
                      } catch (e) {
                        components.push({
                          label: `${prefix} ${entry.name}`,
                          description: entry.name,
                          folderPath: componentPath
                        });
                      }
                    }
                  }
                }
              } catch (e) {
                console.error(`Error reading portal app path: ${portalAppPath}`, e);
              }
            }

            const portalWidgetPath = path.join(modulePath, 'widget');
            if (fs.existsSync(portalWidgetPath)) {
              try {
                const entries = fs.readdirSync(portalWidgetPath, { withFileTypes: true });
                for (const entry of entries) {
                  if (entry.isDirectory() && !entry.name.startsWith('__')) {
                    const componentPath = path.join(portalWidgetPath, entry.name);
                    const appJsonPath = path.join(componentPath, 'app.json');
                    if (fs.existsSync(appJsonPath)) {
                      try {
                        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                        components.push({
                          label: `${prefix} ${entry.name}`,
                          description: appJson.title || entry.name,
                          folderPath: componentPath
                        });
                      } catch (e) {
                        components.push({
                          label: `${prefix} ${entry.name}`,
                          description: entry.name,
                          folderPath: componentPath
                        });
                      }
                    }
                  }
                }
              } catch (e) {
                console.error(`Error reading portal widget path: ${portalWidgetPath}`, e);
              }
            }
          }
        } catch (e) {
          console.error('Error reading portal root for deleteAppComponent:', e);
        }
      }

      if (components.length === 0) {
        vscode.window.showInformationMessage('No app components found.');
        return;
      }

      const selected = await vscode.window.showQuickPick(components, {
        placeHolder: 'Select an app component to delete',
        ignoreFocusOut: true
      });

      if (!selected) {
        return;
      }

      folderPath = selected.folderPath;
      componentName = selected.label;
    }

    const result = await vscode.window.showWarningMessage(
      `Are you sure you want to delete "${componentName}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (result !== 'Delete') {
      return;
    }

    try {
      // 디렉토리 삭제
      fs.rmSync(folderPath, { recursive: true, force: true });

      // Tree View 새로고침
      if (appTreeProvider) {
        appTreeProvider.refresh();
      }
      Object.values(categoryTreeProviders).forEach(provider => {
        if (provider) {
          provider.refresh();
        }
      });

      vscode.window.showInformationMessage(`"${componentName}" has been deleted.`);
    } catch (error) {
      console.error(`Failed to delete ${folderPath}:`, error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  });

  // 삭제 명령어 (Route)
  let deleteRouteCommand = vscode.commands.registerCommand('wiz-extension.deleteRoute', async (route) => {
    let folderPath, routeName;
    if (route && typeof route === 'object') {
      folderPath = route.folderPath;
      routeName = route.name;
    } else if (route && typeof route === 'string') {
      folderPath = route;
      routeName = path.basename(route);
    }

    // path가 없으면 목록에서 선택
    if (!folderPath) {
      // 프로젝트 확인
      let projectPath = categoryTreeProviders['route'] ? categoryTreeProviders['route'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        await vscode.commands.executeCommand('wiz-extension.selectProject');
        projectPath = categoryTreeProviders['route'] ? categoryTreeProviders['route'].selectedProjectPath : null;
        if (!projectPath && appTreeProvider) {
          projectPath = appTreeProvider.selectedProjectPath;
        }
        if (!projectPath) {
          vscode.window.showErrorMessage('Please select a project first.');
          return;
        }
      }

      const srcPath = path.join(projectPath, 'src');

      // 모든 route 목록 가져오기 (기본 + portal framework)
      const routes = [];

      // 1) 기본 src/route
      const routePath = path.join(srcPath, 'route');
      if (fs.existsSync(routePath)) {
        try {
          const entries = fs.readdirSync(routePath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const routeItemPath = path.join(routePath, entry.name);
              const appJsonPath = path.join(routeItemPath, 'app.json');
              if (fs.existsSync(appJsonPath) || fs.existsSync(path.join(routeItemPath, 'controller.py'))) {
                try {
                  let description = entry.name;
                  if (fs.existsSync(appJsonPath)) {
                    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                    description = appJson.title || entry.name;
                  }
                  routes.push({
                    label: entry.name,
                    description: description,
                    folderPath: routeItemPath
                  });
                } catch (e) {
                  routes.push({
                    label: entry.name,
                    description: entry.name,
                    folderPath: routeItemPath
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error reading ${routePath}:`, error);
          vscode.window.showErrorMessage(`Failed to read route directory: ${error.message}`);
          return;
        }
      }

      // 2) portal framework: src/portal/[module]/route
      const portalRoot = path.join(srcPath, 'portal');
      if (fs.existsSync(portalRoot)) {
        try {
          const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
          for (const portalEntry of portalEntries) {
            if (!portalEntry.isDirectory() || portalEntry.name.startsWith('__')) continue;
            const moduleName = portalEntry.name;
            const modulePath = path.join(portalRoot, moduleName);
            const prefix = `[${moduleName}]`;

            const portalRoutePath = path.join(modulePath, 'route');
            if (!fs.existsSync(portalRoutePath)) continue;

            try {
              const entries = fs.readdirSync(portalRoutePath, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const routeItemPath = path.join(portalRoutePath, entry.name);
                  const appJsonPath = path.join(routeItemPath, 'app.json');
                  if (fs.existsSync(appJsonPath) || fs.existsSync(path.join(routeItemPath, 'controller.py'))) {
                    try {
                      let description = entry.name;
                      if (fs.existsSync(appJsonPath)) {
                        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                        description = appJson.title || entry.name;
                      }
                      routes.push({
                        label: `${prefix} ${entry.name}`,
                        description: description,
                        folderPath: routeItemPath
                      });
                    } catch (e) {
                      routes.push({
                        label: `${prefix} ${entry.name}`,
                        description: entry.name,
                        folderPath: routeItemPath
                      });
                    }
                  }
                }
              }
            } catch (e) {
              console.error(`Error reading portal route path: ${portalRoutePath}`, e);
            }
          }
        } catch (e) {
          console.error('Error reading portal root for deleteRoute:', e);
        }
      }

      if (routes.length === 0) {
        vscode.window.showInformationMessage('No routes found.');
        return;
      }

      const selected = await vscode.window.showQuickPick(routes, {
        placeHolder: 'Select a route to delete',
        ignoreFocusOut: true
      });

      if (!selected) {
        return;
      }

      folderPath = selected.folderPath;
      routeName = selected.label;
    }

    const result = await vscode.window.showWarningMessage(
      `Are you sure you want to delete route "${routeName}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (result !== 'Delete') {
      return;
    }

    try {
      // 디렉토리 삭제
      fs.rmSync(folderPath, { recursive: true, force: true });

      // Tree View 새로고침
      if (categoryTreeProviders && categoryTreeProviders['route']) {
        categoryTreeProviders['route'].refresh();
      }

      vscode.window.showInformationMessage(`Route "${routeName}" has been deleted.`);
    } catch (error) {
      console.error(`Failed to delete ${folderPath}:`, error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  });

  // config/build.py에서 template 확인
  const getTemplateType = (projectPath) => {
    const wizRoot = path.dirname(path.dirname(projectPath));
    const configPath = path.join(wizRoot, 'config', 'build.py');
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        const match = content.match(/template\s*=\s*['"]([^'"]+)['"]/);
        if (match && match[1] === 'html') {
          return 'html';
        }
      } catch (e) {
        // 파일 읽기 실패 시 기본값
      }
    }
    return 'pug';
  };

  // namespace에서 selector 생성 (dot을 -로 변환)
  const generateSelector = (categoryType, namespace) => {
    const namespaceDash = namespace.replace(/\./g, '-');
    return `wiz-${categoryType}-${namespaceDash}`;
  };

  // id에서 Component Name 생성 (첫 번째 값을 대문자로 변환)
  const generateComponentName = (id) => {
    const parts = id.split('.');
    if (parts.length > 0) {
      const firstPart = parts[0];
      const capitalized = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      return `${capitalized}Component`;
    }
    return 'Component';
  };

  // template 생성 (pug 또는 html)
  const generateTemplate = (selector, templateType) => {
    if (templateType === 'html') {
      return `<${selector} />`;
    }
    return `${selector}()`;
  };

  // App Component 추가 공통 함수
  const addAppComponent = async (categoryType) => {
    // 카테고리 이름 매핑
    const categoryNames = {
      'page': 'App Page',
      'component': 'App Component',
      'layout': 'App Layout'
    };
    const categoryName = categoryNames[categoryType] || categoryType;

    // 프로젝트가 선택되지 않았으면 자동 선택 시도
    let projectPath = categoryTreeProviders[categoryType] ? categoryTreeProviders[categoryType].selectedProjectPath : null;
    if (!projectPath && appTreeProvider) {
      projectPath = appTreeProvider.selectedProjectPath;
    }

    if (!projectPath) {
      // 프로젝트 선택 요청
      await vscode.commands.executeCommand('wiz-extension.selectProject');
      // 다시 확인
      projectPath = categoryTreeProviders[categoryType] ? categoryTreeProviders[categoryType].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        vscode.window.showErrorMessage('Please select a project first.');
        return;
      }
    }
    const srcPath = path.join(projectPath, 'src');

    // 생성 위치 선택 (특히 component의 경우 portal framework 지원)
    let appBasePath = path.join(srcPath, 'app');
    let locationLabel = 'Default app (src/app)';
    let isPortal = false;
    let portalType = null; // 'app' or 'widget'
    let portalModuleName = null;

    if (categoryType === 'component') {
      const locations = [];

      // 기본 app
      locations.push({
        label: 'Default app (src/app)',
        description: path.relative(projectPath, appBasePath),
        basePath: appBasePath,
        isPortal: false
      });

      // portal framework 모듈들 검색
      const portalRoot = path.join(srcPath, 'portal');
      if (fs.existsSync(portalRoot)) {
        try {
          const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
          for (const entry of portalEntries) {
            if (!entry.isDirectory() || entry.name.startsWith('__')) continue;
            const moduleName = entry.name;
            const modulePath = path.join(portalRoot, moduleName);

            const portalAppPath = path.join(modulePath, 'app');
            if (fs.existsSync(portalAppPath)) {
              locations.push({
                label: `[${moduleName}] app (portal/${moduleName}/app)`,
                description: path.relative(projectPath, portalAppPath),
                basePath: portalAppPath,
                isPortal: true,
                portalType: 'app',
                portalModuleName: moduleName
              });
            }

            const portalWidgetPath = path.join(modulePath, 'widget');
            if (fs.existsSync(portalWidgetPath)) {
              locations.push({
                label: `[${moduleName}] widget (portal/${moduleName}/widget)`,
                description: path.relative(projectPath, portalWidgetPath),
                basePath: portalWidgetPath,
                isPortal: true,
                portalType: 'widget',
                portalModuleName: moduleName
              });
            }
          }
        } catch (e) {
          console.error('[wiz-extension] Failed to read portal directory:', e);
        }
      }

      // 위치 선택 (옵션이 여러 개일 때만)
      if (locations.length > 1) {
        const selectedLocation = await vscode.window.showQuickPick(locations, {
          placeHolder: 'Select where to create the component (default app or portal module)',
          ignoreFocusOut: true
        });

        if (!selectedLocation) {
          return;
        }

        appBasePath = selectedLocation.basePath;
        locationLabel = selectedLocation.label;
        isPortal = selectedLocation.isPortal || false;
        portalType = selectedLocation.portalType || null;
        portalModuleName = selectedLocation.portalModuleName || null;
      }
    }

    // namespace 입력 (필수)
    let namespacePrompt = `Enter ${categoryName} namespace (e.g., main, header) - lowercase letters and dots only`;
    let namespacePlaceholder = 'main';
    
    // portal widget인 경우 안내 추가
    if (isPortal && portalType === 'widget') {
      namespacePrompt = `Enter ${categoryName} namespace (e.g., test) - "widget." will be automatically prepended`;
      namespacePlaceholder = 'test';
    }

    const namespaceInput = await vscode.window.showInputBox({
      prompt: namespacePrompt,
      placeHolder: namespacePlaceholder,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Namespace cannot be empty';
        }
        if (!value.match(/^[a-z0-9.]+$/)) {
          return 'Namespace can only contain lowercase letters, numbers, and dots';
        }
        return null;
      }
    });

    if (!namespaceInput) {
      return;
    }

    // portal widget인 경우 "widget." prefix 자동 추가
    let namespace = namespaceInput.trim();
    if (isPortal && portalType === 'widget') {
      if (!namespace.startsWith('widget.')) {
        namespace = `widget.${namespace}`;
      }
    }

    // title 입력 (선택, 생략 시 namespace 사용)
    const titleInput = await vscode.window.showInputBox({
      prompt: `Enter ${categoryName} title (optional, press Enter to use namespace)`,
      placeHolder: namespace,
      value: namespace
    });

    const title = titleInput && titleInput.trim() ? titleInput.trim() : namespace;

    // portal인 경우 category는 입력받지 않음 (빈 문자열로 유지)

    // page인 경우 추가 입력
    let viewuri = null;
    let layout = null;
    let controller = null;

    if (categoryType === 'page') {
      // viewuri 입력 (필수)
      const viewuriInput = await vscode.window.showInputBox({
        prompt: `Enter viewuri (Angular Route Path, e.g., /main/:id?)`,
        placeHolder: `/${namespace}/:id?`,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Viewuri cannot be empty';
          }
          return null;
        }
      });

      if (!viewuriInput) {
        return;
      }
      viewuri = viewuriInput.trim();

      // layout 선택 (필수)
      const layoutPath = path.join(srcPath, 'app');
      const layouts = [];
      if (fs.existsSync(layoutPath)) {
        try {
          const entries = fs.readdirSync(layoutPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('layout.')) {
              const layoutJsonPath = path.join(layoutPath, entry.name, 'app.json');
              if (fs.existsSync(layoutJsonPath)) {
                try {
                  const layoutJson = JSON.parse(fs.readFileSync(layoutJsonPath, 'utf8'));
                  layouts.push({
                    label: entry.name,
                    description: layoutJson.title || entry.name
                  });
                } catch (e) {
                  layouts.push({
                    label: entry.name,
                    description: entry.name
                  });
                }
              }
            }
          }
        } catch (e) {
          // 에러 무시
        }
      }

      if (layouts.length > 0) {
        const selectedLayout = await vscode.window.showQuickPick(layouts, {
          placeHolder: 'Select a layout (required)',
          ignoreFocusOut: true
        });

        if (!selectedLayout) {
          return;
        }
        layout = selectedLayout.label;
      } else {
        // layout이 없으면 기본값 사용
        layout = 'layout.navbar';
      }
    }

    // controller 선택 (선택) - page, component, layout 모두
    const controllerPath = path.join(srcPath, 'controller');
    const controllers = [];
    if (fs.existsSync(controllerPath)) {
      try {
        const entries = fs.readdirSync(controllerPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.py')) {
            controllers.push({
              label: entry.name.replace('.py', ''),
              description: entry.name
            });
          }
        }
      } catch (e) {
        // 에러 무시
      }
    }

    if (controllers.length > 0) {
      controllers.push({ label: '(None)', description: 'No controller' });
      const selectedController = await vscode.window.showQuickPick(controllers, {
        placeHolder: 'Select a controller (optional)',
        ignoreFocusOut: true
      });

      if (selectedController && selectedController.label !== '(None)') {
        controller = selectedController.label;
      }
    }

    // portal인 경우와 아닌 경우 분기
    let appJson;
    let id;
    let componentPath;

    if (isPortal) {
      // portal framework: id는 namespace와 동일
      id = namespace;

      // template 생성: wiz-portal-{module_name}-{namespace} 형태
      // namespace의 dot(.)을 -로 변환
      const templateNamespace = namespace.replace(/\./g, '-');
      const templateBase = `wiz-portal-${portalModuleName}-${templateNamespace}`;
      
      const templateType = getTemplateType(projectPath);
      let template;
      if (templateType === 'html') {
        template = `<${templateBase} />`;
      } else {
        template = `${templateBase}()`;
      }

      // app.json 생성 (portal 구조)
      appJson = {
        type: portalType, // 'app' or 'widget'
        mode: 'portal',
        namespace: namespace,
        id: id,
        title: title,
        viewuri: '',
        controller: controller || '',
        template: template
      };

      // componentPath는 namespace로 생성 (id와 동일)
      componentPath = path.join(appBasePath, id);
    } else {
      // 기존 로직 (default app)
      // id 생성
      id = `${categoryType}.${namespace}`;

      // ng.build.name 생성
      const componentName = generateComponentName(id);

      // ng.selector 생성
      const selector = generateSelector(categoryType, namespace);

      // template 타입 확인
      const templateType = getTemplateType(projectPath);

      // template 생성
      const template = generateTemplate(selector, templateType);

      // app.json 생성
      appJson = {
        mode: categoryType,
        namespace: namespace,
        id: id,
        title: title
      };

      if (categoryType === 'page') {
        appJson.viewuri = viewuri;
        appJson.layout = layout;
      }

      // controller 추가 (page, component, layout 모두)
      if (controller) {
        appJson.controller = controller;
      } else {
        appJson.controller = '';
      }

      // ng.build 추가
      appJson['ng.build'] = {
        id: id,
        name: componentName,
        path: `./${id}/${id}.component`
      };

      // ng 추가
      appJson.ng = {
        selector: selector,
        inputs: [],
        outputs: []
      };

      // template 추가
      appJson.template = template;

      // componentPath는 id로 생성
      componentPath = path.join(appBasePath, id);
    }

    // componentPath 디렉토리 생성
    fs.mkdirSync(componentPath, { recursive: true });

    // app.json 저장
    fs.writeFileSync(
      path.join(componentPath, 'app.json'),
      JSON.stringify(appJson, null, 2),
      'utf8'
    );

    // view.html 또는 view.pug 생성
    const templateType = getTemplateType(projectPath);
    const viewFileName = templateType === 'html' ? 'view.html' : 'view.pug';
    const viewTemplate = templateType === 'html'
      ? `<div>${title}</div>`
      : `div ${title}`;
    fs.writeFileSync(
      path.join(componentPath, viewFileName),
      viewTemplate,
      'utf8'
    );

    // view.ts 생성
    const viewTsContent = `import { OnInit, Input } from "@angular/core";
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
    fs.writeFileSync(
      path.join(componentPath, 'view.ts'),
      viewTsContent,
      'utf8'
    );

    // Tree View 새로고침
    if (categoryTreeProviders[categoryType]) {
      categoryTreeProviders[categoryType].refresh();
    }

    vscode.window.showInformationMessage(`${categoryName} "${id}" has been created.`);
  };

  // 추가 명령어 (App Component: page, component, layout)
  let addAppComponentCommand = vscode.commands.registerCommand('wiz-extension.addAppComponent', async (categoryType) => {
    // categoryType이 없으면 에러
    if (!categoryType || typeof categoryType !== 'string') {
      vscode.window.showErrorMessage('Category type is not specified.');
      return;
    }
    await addAppComponent(categoryType);
  });

  // 각 카테고리별 별도 명령어 (view/title에서 args가 제대로 전달되지 않는 경우 대비)
  let addPageCommand = vscode.commands.registerCommand('wiz-extension.addPage', async () => {
    await addAppComponent('page');
  });

  let addComponentCommand = vscode.commands.registerCommand('wiz-extension.addComponent', async () => {
    await addAppComponent('component');
  });

  let addLayoutCommand = vscode.commands.registerCommand('wiz-extension.addLayout', async () => {
    await addAppComponent('layout');
  });

  // 삭제 명령어 (Controller/Model 파일)
  let deleteControllerModelCommand = vscode.commands.registerCommand('wiz-extension.deleteControllerModel', async (item) => {
    let filePath, itemName, categoryType;
    
    // CategoryItem 객체인 경우
    if (item && typeof item === 'object' && item.filePath) {
      filePath = item.filePath;
      itemName = path.basename(filePath);
      categoryType = item.type;
    } else if (item && typeof item === 'string') {
      filePath = item;
      itemName = path.basename(filePath);
      // 경로에서 categoryType 추론
      categoryType = filePath.includes('/controller/') ? 'controller' : 'model';
    }

    // path가 없으면 목록에서 선택
    if (!filePath) {
      // 먼저 categoryType 선택
      const categorySelection = await vscode.window.showQuickPick([
        { label: 'Server Controller', categoryType: 'controller' },
        { label: 'Server Model', categoryType: 'model' }
      ], {
        placeHolder: 'Select category',
        ignoreFocusOut: true
      });

      if (!categorySelection) {
        return;
      }

      categoryType = categorySelection.categoryType;

      // 프로젝트 확인
      let projectPath = categoryTreeProviders[categoryType] ? categoryTreeProviders[categoryType].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        await vscode.commands.executeCommand('wiz-extension.selectProject');
        projectPath = categoryTreeProviders[categoryType] ? categoryTreeProviders[categoryType].selectedProjectPath : null;
        if (!projectPath && appTreeProvider) {
          projectPath = appTreeProvider.selectedProjectPath;
        }
        if (!projectPath) {
          vscode.window.showErrorMessage('Please select a project first.');
          return;
        }
      }

      const srcPath = path.join(projectPath, 'src');

      // 기본 및 portal framework 디렉토리들에서 모든 파일 목록 가져오기
      const files = [];

      // 1) 기본 src/controller 또는 src/model
      const targetPath = path.join(srcPath, categoryType);
      const pushFilesFromDir = (baseDir, prefix = '') => {
        if (!fs.existsSync(baseDir)) return;
        try {
          const entries = fs.readdirSync(baseDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.py')) {
              files.push({
                label: `${prefix}${entry.name}`,
                description: entry.name,
                filePath: path.join(baseDir, entry.name)
              });
            }
          }
        } catch (error) {
          console.error(`Error reading ${baseDir}:`, error);
        }
      };

      pushFilesFromDir(targetPath);

      // 2) portal framework: src/portal/[module]/controller or /model
      const portalRoot = path.join(srcPath, 'portal');
      if (fs.existsSync(portalRoot)) {
        try {
          const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
          for (const portalEntry of portalEntries) {
            if (!portalEntry.isDirectory() || portalEntry.name.startsWith('__')) continue;
            const moduleName = portalEntry.name;
            const modulePath = path.join(portalRoot, moduleName);
            const portalDir = path.join(modulePath, categoryType);
            const prefix = `[${moduleName}] `;
            pushFilesFromDir(portalDir, prefix);
          }
        } catch (e) {
          console.error('Error reading portal root for deleteControllerModel:', e);
        }
      }

      if (files.length === 0) {
        vscode.window.showInformationMessage(`No ${categorySelection.label.toLowerCase()} files found.`);
        return;
      }

      const selected = await vscode.window.showQuickPick(files, {
        placeHolder: `Select a ${categorySelection.label.toLowerCase()} file to delete`,
        ignoreFocusOut: true
      });

      if (!selected) {
        return;
      }

      filePath = selected.filePath;
      itemName = selected.label;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }

    const isDirectory = fs.statSync(filePath).isDirectory();
    const itemType = isDirectory ? 'directory' : 'file';

    const result = await vscode.window.showWarningMessage(
      `Are you sure you want to delete ${itemType} "${itemName}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (result !== 'Delete') {
      return;
    }

    try {
      if (isDirectory) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }

      // Tree View 새로고침
      if (!categoryType) {
        categoryType = filePath.includes('/controller/') ? 'controller' : 'model';
      }
      if (categoryTreeProviders[categoryType]) {
        categoryTreeProviders[categoryType].refresh();
      }

      vscode.window.showInformationMessage(`"${itemName}" has been deleted.`);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  });

  // 추가 명령어 (Controller)
  let addControllerCommand = vscode.commands.registerCommand('wiz-extension.addController', async () => {
    const categoryName = 'Server Controller';
    // 프로젝트가 선택되지 않았으면 자동 선택 시도
    let projectPath = categoryTreeProviders['controller'] ? categoryTreeProviders['controller'].selectedProjectPath : null;
    if (!projectPath && appTreeProvider) {
      projectPath = appTreeProvider.selectedProjectPath;
    }

    if (!projectPath) {
      // 프로젝트 선택 요청
      await vscode.commands.executeCommand('wiz-extension.selectProject');
      // 다시 확인
      projectPath = categoryTreeProviders['controller'] ? categoryTreeProviders['controller'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        vscode.window.showErrorMessage('Please select a project first.');
        return;
      }
    }
    const srcPath = path.join(projectPath, 'src');

    // 생성 위치 선택 (default 또는 portal framework)
    let controllerBasePath = path.join(srcPath, 'controller');
    const locations = [];

    locations.push({
      label: 'Default controller (src/controller)',
      description: path.relative(projectPath, controllerBasePath),
      basePath: controllerBasePath
    });

    const portalRoot = path.join(srcPath, 'portal');
    if (fs.existsSync(portalRoot)) {
      try {
        const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
        for (const entry of portalEntries) {
          if (!entry.isDirectory() || entry.name.startsWith('__')) continue;
          const moduleName = entry.name;
          const modulePath = path.join(portalRoot, moduleName);
          const portalControllerPath = path.join(modulePath, 'controller');
          if (fs.existsSync(portalControllerPath)) {
            locations.push({
              label: `[${moduleName}] controller (portal/${moduleName}/controller)`,
              description: path.relative(projectPath, portalControllerPath),
              basePath: portalControllerPath
            });
          }
        }
      } catch (e) {
        console.error('[wiz-extension] Failed to read portal controller directories:', e);
      }
    }

    if (locations.length > 1) {
      const selectedLocation = await vscode.window.showQuickPick(locations, {
        placeHolder: 'Select where to create the controller (default or portal module)',
        ignoreFocusOut: true
      });

      if (!selectedLocation) {
        return;
      }

      controllerBasePath = selectedLocation.basePath;
    }

    // controller 디렉토리가 없으면 생성
    if (!fs.existsSync(controllerBasePath)) {
      fs.mkdirSync(controllerBasePath, { recursive: true });
    }

    // 파일 이름 입력
    const inputName = await vscode.window.showInputBox({
      prompt: `Enter ${categoryName} file name (e.g., user, api)`,
      placeHolder: 'controller',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Name cannot be empty';
        }
        // .py 확장자를 제외한 부분만 검사
        const nameWithoutExt = value.endsWith('.py') ? value.slice(0, -3) : value;
        if (!nameWithoutExt.match(/^[a-zA-Z0-9._-]+$/)) {
          return 'Name can only contain letters, numbers, dots, underscores, and hyphens';
        }
        // .py 확장자를 자동으로 추가
        const fileName = value.endsWith('.py') ? value : `${value}.py`;
        const filePath = path.join(controllerBasePath, fileName);
        if (fs.existsSync(filePath)) {
          return 'File already exists';
        }
        return null;
      }
    });

    if (!inputName) {
      return;
    }

    // .py 확장자가 없으면 자동으로 추가
    const fileName = inputName.endsWith('.py') ? inputName : `${inputName}.py`;

    try {
      const filePath = path.join(controllerBasePath, fileName);
      fs.writeFileSync(filePath, '', 'utf8');

      // Tree View 새로고침
      if (categoryTreeProviders['controller']) {
        categoryTreeProviders['controller'].refresh();
      }

      vscode.window.showInformationMessage(`${categoryName} "${fileName}" has been created.`);
    } catch (error) {
      console.error(`Failed to create controller:`, error);
      vscode.window.showErrorMessage(`Failed to create controller: ${error.message}`);
    }
  });

  // 추가 명령어 (Model)
  let addModelCommand = vscode.commands.registerCommand('wiz-extension.addModel', async () => {
    const categoryName = 'Server Model';
    // 프로젝트가 선택되지 않았으면 자동 선택 시도
    let projectPath = categoryTreeProviders['model'] ? categoryTreeProviders['model'].selectedProjectPath : null;
    if (!projectPath && appTreeProvider) {
      projectPath = appTreeProvider.selectedProjectPath;
    }

    if (!projectPath) {
      // 프로젝트 선택 요청
      await vscode.commands.executeCommand('wiz-extension.selectProject');
      // 다시 확인
      projectPath = categoryTreeProviders['model'] ? categoryTreeProviders['model'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        vscode.window.showErrorMessage('Please select a project first.');
        return;
      }
    }
    const srcPath = path.join(projectPath, 'src');

    // 생성 위치 선택 (default 또는 portal framework)
    let modelBasePath = path.join(srcPath, 'model');
    const locations = [];

    locations.push({
      label: 'Default model (src/model)',
      description: path.relative(projectPath, modelBasePath),
      basePath: modelBasePath
    });

    const portalRoot = path.join(srcPath, 'portal');
    if (fs.existsSync(portalRoot)) {
      try {
        const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
        for (const entry of portalEntries) {
          if (!entry.isDirectory() || entry.name.startsWith('__')) continue;
          const moduleName = entry.name;
          const modulePath = path.join(portalRoot, moduleName);
          const portalModelPath = path.join(modulePath, 'model');
          if (fs.existsSync(portalModelPath)) {
            locations.push({
              label: `[${moduleName}] model (portal/${moduleName}/model)`,
              description: path.relative(projectPath, portalModelPath),
              basePath: portalModelPath
            });
          }
        }
      } catch (e) {
        console.error('[wiz-extension] Failed to read portal model directories:', e);
      }
    }

    if (locations.length > 1) {
      const selectedLocation = await vscode.window.showQuickPick(locations, {
        placeHolder: 'Select where to create the model (default or portal module)',
        ignoreFocusOut: true
      });

      if (!selectedLocation) {
        return;
      }

      modelBasePath = selectedLocation.basePath;
    }

    // model 디렉토리가 없으면 생성
    if (!fs.existsSync(modelBasePath)) {
      fs.mkdirSync(modelBasePath, { recursive: true });
    }

    // 파일 이름 입력
    const inputName = await vscode.window.showInputBox({
      prompt: `Enter ${categoryName} file name (e.g., user, product)`,
      placeHolder: 'model',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Name cannot be empty';
        }
        // .py 확장자를 제외한 부분만 검사
        const nameWithoutExt = value.endsWith('.py') ? value.slice(0, -3) : value;
        if (!nameWithoutExt.match(/^[a-zA-Z0-9._-]+$/)) {
          return 'Name can only contain letters, numbers, dots, underscores, and hyphens';
        }
        // .py 확장자 자동 추가
        const fileName = value.endsWith('.py') ? value : `${value}.py`;
        const filePath = path.join(modelBasePath, fileName);
        if (fs.existsSync(filePath)) {
          return 'File already exists';
        }
        return null;
      }
    });

    if (!inputName) {
      return;
    }

    // .py 확장자가 없으면 자동으로 추가
    const fileName = inputName.endsWith('.py') ? inputName : `${inputName}.py`;

    try {
      const filePath = path.join(modelBasePath, fileName);
      fs.writeFileSync(filePath, '', 'utf8');

      // Tree View 새로고침
      if (categoryTreeProviders['model']) {
        categoryTreeProviders['model'].refresh();
      }

      vscode.window.showInformationMessage(`${categoryName} "${fileName}" has been created.`);
    } catch (error) {
      console.error(`Failed to create model:`, error);
      vscode.window.showErrorMessage(`Failed to create model: ${error.message}`);
    }
  });

  // 추가 명령어 (Route)
  let addRouteCommand = vscode.commands.registerCommand('wiz-extension.addRoute', async () => {
    const categoryName = 'Server Route';
    // 프로젝트가 선택되지 않았으면 자동 선택 시도
    let projectPath = categoryTreeProviders['route'] ? categoryTreeProviders['route'].selectedProjectPath : null;
    if (!projectPath && appTreeProvider) {
      projectPath = appTreeProvider.selectedProjectPath;
    }

    if (!projectPath) {
      // 프로젝트 선택 요청
      await vscode.commands.executeCommand('wiz-extension.selectProject');
      // 다시 확인
      projectPath = categoryTreeProviders['route'] ? categoryTreeProviders['route'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        vscode.window.showErrorMessage('Please select a project first.');
        return;
      }
    }
    const srcPath = path.join(projectPath, 'src');

    // 생성 위치 선택 (default 또는 portal framework)
    let routeBasePath = path.join(srcPath, 'route');
    const locations = [];

    locations.push({
      label: 'Default route (src/route)',
      description: path.relative(projectPath, routeBasePath),
      basePath: routeBasePath
    });

    const portalRoot = path.join(srcPath, 'portal');
    if (fs.existsSync(portalRoot)) {
      try {
        const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
        for (const entry of portalEntries) {
          if (!entry.isDirectory() || entry.name.startsWith('__')) continue;
          const moduleName = entry.name;
          const modulePath = path.join(portalRoot, moduleName);
          const portalRoutePath = path.join(modulePath, 'route');
          if (fs.existsSync(portalRoutePath)) {
            locations.push({
              label: `[${moduleName}] route (portal/${moduleName}/route)`,
              description: path.relative(projectPath, portalRoutePath),
              basePath: portalRoutePath
            });
          }
        }
      } catch (e) {
        console.error('[wiz-extension] Failed to read portal route directories:', e);
      }
    }

    if (locations.length > 1) {
      const selectedLocation = await vscode.window.showQuickPick(locations, {
        placeHolder: 'Select where to create the route (default or portal module)',
        ignoreFocusOut: true
      });

      if (!selectedLocation) {
        return;
      }

      routeBasePath = selectedLocation.basePath;
    }

    // route 디렉토리가 없으면 생성
    if (!fs.existsSync(routeBasePath)) {
      fs.mkdirSync(routeBasePath, { recursive: true });
    }

    // id 입력 (필수)
    const id = await vscode.window.showInputBox({
      prompt: `Enter ${categoryName} id (e.g., test, api) - lowercase letters and dots only`,
      placeHolder: 'test',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Id cannot be empty';
        }
        if (!value.match(/^[a-z0-9.]+$/)) {
          return 'Id can only contain lowercase letters, numbers, and dots';
        }
        const routeItemPath = path.join(routeBasePath, value);
        if (fs.existsSync(routeItemPath)) {
          return 'Route already exists';
        }
        return null;
      }
    });

    if (!id) {
      return;
    }

    // title 입력 (선택, 생략 시 id 사용)
    const titleInput = await vscode.window.showInputBox({
      prompt: `Enter ${categoryName} title (optional, press Enter to use id)`,
      placeHolder: id,
      value: id
    });

    const title = titleInput && titleInput.trim() ? titleInput.trim() : id;

    // route 입력 (필수)
    const routeInput = await vscode.window.showInputBox({
      prompt: `Enter route (Flask Route Path, e.g., /test, /api/user)`,
      placeHolder: `/${id}`,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route cannot be empty';
        }
        return null;
      }
    });

    if (!routeInput) {
      return;
    }
    const route = routeInput.trim();

    // controller 선택 (선택)
    const controllerPath = path.join(srcPath, 'controller');
    const controllers = [];
    if (fs.existsSync(controllerPath)) {
      try {
        const entries = fs.readdirSync(controllerPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.py')) {
            controllers.push({
              label: entry.name.replace('.py', ''),
              description: entry.name
            });
          }
        }
      } catch (e) {
        // 에러 무시
      }
    }

    let controller = null;
    if (controllers.length > 0) {
      controllers.push({ label: '(None)', description: 'No controller' });
      const selectedController = await vscode.window.showQuickPick(controllers, {
        placeHolder: 'Select a controller (optional)',
        ignoreFocusOut: true
      });

      if (selectedController && selectedController.label !== '(None)') {
        controller = selectedController.label;
      }
    }

    try {
      const routeItemPath = path.join(routeBasePath, id);
      fs.mkdirSync(routeItemPath, { recursive: true });

      // app.json 생성
      const appJson = {
        id: id,
        title: title,
        route: route
      };

      if (controller) {
        appJson.controller = controller;
      } else {
        appJson.controller = 'base';
      }

      fs.writeFileSync(
        path.join(routeItemPath, 'app.json'),
        JSON.stringify(appJson, null, 2),
        'utf8'
      );

      // controller.py 생성
      fs.writeFileSync(
        path.join(routeItemPath, 'controller.py'),
        '',
        'utf8'
      );

      // Tree View 새로고침
      if (categoryTreeProviders['route']) {
        categoryTreeProviders['route'].refresh();
      }

      vscode.window.showInformationMessage(`${categoryName} "${id}" has been created.`);
    } catch (error) {
      console.error(`Failed to create route:`, error);
      vscode.window.showErrorMessage(`Failed to create route: ${error.message}`);
    }
  });

  // Assets 삭제 명령어
  let deleteAssetCommand = vscode.commands.registerCommand('wiz-extension.deleteAsset', async (item) => {
    let filePath, itemName;
    
    // CategoryItem 객체인 경우
    if (item && typeof item === 'object' && item.filePath) {
      filePath = item.filePath;
      itemName = path.basename(filePath);
    } else if (item && typeof item === 'string') {
      filePath = item;
      itemName = path.basename(filePath);
    }

    // path가 없으면 목록에서 선택
    if (!filePath) {
      // 프로젝트 확인
      let projectPath = categoryTreeProviders['assets'] ? categoryTreeProviders['assets'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        await vscode.commands.executeCommand('wiz-extension.selectProject');
        projectPath = categoryTreeProviders['assets'] ? categoryTreeProviders['assets'].selectedProjectPath : null;
        if (!projectPath && appTreeProvider) {
          projectPath = appTreeProvider.selectedProjectPath;
        }
        if (!projectPath) {
          vscode.window.showErrorMessage('Please select a project first.');
          return;
        }
      }

      const srcPath = path.join(projectPath, 'src');

      // 모든 assets 목록 가져오기 (기본 + portal framework, 재귀적으로)
      const getAllAssets = (dir, basePath, prefix = '') => {
        const items = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('__') || entry.name.startsWith('.')) {
              continue;
            }
            const entryPath = path.join(dir, entry.name);
            const relativePath = path.relative(basePath, entryPath);
            if (entry.isDirectory()) {
              items.push({
                label: `${prefix}${entry.name}`,
                description: `📁 ${prefix}${relativePath}`,
                filePath: entryPath
              });
              // 하위 항목도 추가
              items.push(...getAllAssets(entryPath, basePath, prefix));
            } else {
              items.push({
                label: `${prefix}${entry.name}`,
                description: `📄 ${prefix}${relativePath}`,
                filePath: entryPath
              });
            }
          }
        } catch (error) {
          console.error(`Error reading ${dir}:`, error);
        }
        return items;
      };

      const assets = [];

      // 1) 기본 src/assets
      const assetsPath = path.join(srcPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        assets.push(...getAllAssets(assetsPath, assetsPath));
      }

      // 2) portal framework: src/portal/[module]/assets
      const portalRoot = path.join(srcPath, 'portal');
      if (fs.existsSync(portalRoot)) {
        try {
          const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
          for (const portalEntry of portalEntries) {
            if (!portalEntry.isDirectory() || portalEntry.name.startsWith('__')) continue;
            const moduleName = portalEntry.name;
            const modulePath = path.join(portalRoot, moduleName);
            const portalAssetsPath = path.join(modulePath, 'assets');
            if (fs.existsSync(portalAssetsPath)) {
              const prefix = `[${moduleName}] `;
              assets.push(...getAllAssets(portalAssetsPath, portalAssetsPath, prefix));
            }
          }
        } catch (e) {
          console.error('Error reading portal root for deleteAsset:', e);
        }
      }

      if (assets.length === 0) {
        vscode.window.showInformationMessage('No assets found.');
        return;
      }

      const selected = await vscode.window.showQuickPick(assets, {
        placeHolder: 'Select an asset file or folder to delete',
        ignoreFocusOut: true
      });

      if (!selected) {
        return;
      }

      filePath = selected.filePath;
      itemName = selected.label;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }

    const isDirectory = fs.statSync(filePath).isDirectory();
    const itemType = isDirectory ? 'directory' : 'file';

    const result = await vscode.window.showWarningMessage(
      `Are you sure you want to delete ${itemType} "${itemName}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (result !== 'Delete') {
      return;
    }

    try {
      if (isDirectory) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }

      // Tree View 새로고침
      if (categoryTreeProviders && categoryTreeProviders['assets']) {
        categoryTreeProviders['assets'].refresh();
      }

      vscode.window.showInformationMessage(`"${itemName}" has been deleted.`);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  });

  // Assets 다운로드 명령어
  let downloadAssetCommand = vscode.commands.registerCommand('wiz-extension.downloadAsset', async (item) => {
    let filePath, itemName;
    
    // CategoryItem 객체인 경우
    if (item && typeof item === 'object' && item.filePath) {
      filePath = item.filePath;
      itemName = path.basename(filePath);
    } else if (item && typeof item === 'string') {
      filePath = item;
      itemName = path.basename(filePath);
    }

    // path가 없으면 목록에서 선택
    if (!filePath) {
      // 프로젝트 확인
      let projectPath = categoryTreeProviders['assets'] ? categoryTreeProviders['assets'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        await vscode.commands.executeCommand('wiz-extension.selectProject');
        projectPath = categoryTreeProviders['assets'] ? categoryTreeProviders['assets'].selectedProjectPath : null;
        if (!projectPath && appTreeProvider) {
          projectPath = appTreeProvider.selectedProjectPath;
        }
        if (!projectPath) {
          vscode.window.showErrorMessage('Please select a project first.');
          return;
        }
      }

      const srcPath = path.join(projectPath, 'src');
      const assetsPath = path.join(srcPath, 'assets');
      if (!fs.existsSync(assetsPath)) {
        vscode.window.showErrorMessage('No assets found.');
        return;
      }

      // 모든 파일 목록 가져오기 (디렉토리 제외)
      const getAllFiles = (dir, basePath) => {
        const items = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('__') || entry.name.startsWith('.')) {
              continue;
            }
            const entryPath = path.join(dir, entry.name);
            const relativePath = path.relative(basePath, entryPath);
            if (entry.isDirectory()) {
              // 하위 파일들도 추가
              items.push(...getAllFiles(entryPath, basePath));
            } else {
              items.push({
                label: entry.name,
                description: `📄 ${relativePath}`,
                filePath: entryPath
              });
            }
          }
        } catch (error) {
          console.error(`Error reading ${dir}:`, error);
        }
        return items;
      };

      const files = getAllFiles(assetsPath, assetsPath);

      if (files.length === 0) {
        vscode.window.showInformationMessage('No asset files found.');
        return;
      }

      const selected = await vscode.window.showQuickPick(files, {
        placeHolder: 'Select an asset file to download',
        ignoreFocusOut: true
      });

      if (!selected) {
        return;
      }

      filePath = selected.filePath;
      itemName = selected.label;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      vscode.window.showErrorMessage('File not found');
      return;
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      vscode.window.showWarningMessage('Cannot download a directory. Please select a file.');
      return;
    }

    try {
      // 다운로드 위치 선택
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(itemName),
        saveLabel: 'Download'
      });

      if (!uri) {
        return;
      }

      // 파일 복사
      fs.copyFileSync(filePath, uri.fsPath);
      vscode.window.showInformationMessage(`"${itemName}" has been downloaded.`);
    } catch (error) {
      console.error(`Failed to download ${filePath}:`, error);
      vscode.window.showErrorMessage(`Failed to download: ${error.message}`);
    }
  });

  // Assets 업로드 명령어
  let uploadAssetCommand = vscode.commands.registerCommand('wiz-extension.uploadAsset', async () => {
    // 프로젝트가 선택되지 않았으면 자동 선택 시도
    let projectPath = categoryTreeProviders['assets'] ? categoryTreeProviders['assets'].selectedProjectPath : null;
    if (!projectPath && appTreeProvider) {
      projectPath = appTreeProvider.selectedProjectPath;
    }

    if (!projectPath) {
      // 프로젝트 선택 요청
      await vscode.commands.executeCommand('wiz-extension.selectProject');
      // 다시 확인
      projectPath = categoryTreeProviders['assets'] ? categoryTreeProviders['assets'].selectedProjectPath : null;
      if (!projectPath && appTreeProvider) {
        projectPath = appTreeProvider.selectedProjectPath;
      }
      if (!projectPath) {
        vscode.window.showErrorMessage('Please select a project first.');
        return;
      }
    }

    const srcPath = path.join(projectPath, 'src');

    // 업로드 위치 선택 (default 또는 portal framework)
    let assetsBasePath = path.join(srcPath, 'assets');
    const locations = [];

    locations.push({
      label: 'Default assets (src/assets)',
      description: path.relative(projectPath, assetsBasePath),
      basePath: assetsBasePath
    });

    const portalRoot = path.join(srcPath, 'portal');
    if (fs.existsSync(portalRoot)) {
      try {
        const portalEntries = fs.readdirSync(portalRoot, { withFileTypes: true });
        for (const entry of portalEntries) {
          if (!entry.isDirectory() || entry.name.startsWith('__')) continue;
          const moduleName = entry.name;
          const modulePath = path.join(portalRoot, moduleName);
          const portalAssetsPath = path.join(modulePath, 'assets');
          // assets 디렉토리가 존재하지 않아도 선택 시 생성할 수 있으므로, 모듈만 존재하면 표시
          locations.push({
            label: `[${moduleName}] assets (portal/${moduleName}/assets)`,
            description: path.relative(projectPath, portalAssetsPath),
            basePath: portalAssetsPath
          });
        }
      } catch (e) {
        console.error('[wiz-extension] Failed to read portal assets directories:', e);
      }
    }

    if (locations.length > 1) {
      const selectedLocation = await vscode.window.showQuickPick(locations, {
        placeHolder: 'Select where to upload assets (default or portal module)',
        ignoreFocusOut: true
      });

      if (!selectedLocation) {
        return;
      }

      assetsBasePath = selectedLocation.basePath;
    }

    // 선택된 위치의 assets 디렉토리가 없으면 생성
    if (!fs.existsSync(assetsBasePath)) {
      fs.mkdirSync(assetsBasePath, { recursive: true });
    }

    try {
      // 파일 선택
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        openLabel: 'Upload'
      });

      if (!uris || uris.length === 0) {
        return;
      }

      // 각 파일을 선택된 assets 디렉토리에 복사
      for (const uri of uris) {
        const sourcePath = uri.fsPath;
        const fileName = path.basename(sourcePath);
        const targetPath = path.join(assetsBasePath, fileName);

        // 중복 파일 확인
        if (fs.existsSync(targetPath)) {
          const overwrite = await vscode.window.showWarningMessage(
            `File "${fileName}" already exists. Overwrite?`,
            { modal: true },
            'Overwrite',
            'Skip'
          );

          if (overwrite !== 'Overwrite') {
            continue;
          }
        }

        fs.copyFileSync(sourcePath, targetPath);
      }

      // Tree View 새로고침
      if (categoryTreeProviders && categoryTreeProviders['assets']) {
        categoryTreeProviders['assets'].refresh();
      }

      vscode.window.showInformationMessage(`${uris.length} file(s) uploaded successfully.`);
    } catch (error) {
      console.error(`Failed to upload files:`, error);
      vscode.window.showErrorMessage(`Failed to upload: ${error.message}`);
    }
  });

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
    deleteAppComponentCommand,
    deleteRouteCommand,
    deleteControllerModelCommand,
    addAppComponentCommand,
    addPageCommand,
    addComponentCommand,
    addLayoutCommand,
    addRouteCommand,
    addControllerCommand,
    addModelCommand,
    deleteAssetCommand,
    downloadAssetCommand,
    uploadAssetCommand,
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
