const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class AppComponent {
    constructor(name, folderPath, label, isActive = false) {
        this.name = name;
        this.folderPath = folderPath;
        this.label = label;
        this.isActive = isActive;
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        this.command = {
            command: 'wiz-extension.openComponent',
            title: 'Open Component',
            arguments: [{ folderPath: folderPath, name: name }]
        };
    }

    get tooltip() {
        return this.folderPath;
    }

    get description() {
        // 활성화된 경우 시각적 표시 추가
        if (this.isActive) {
            return `● ${this.name}`;
        }
        return this.name;
    }

    get iconPath() {
        // app.json을 읽어서 타입에 따라 아이콘 변경
        const appJsonPath = path.join(this.folderPath, 'app.json');
        let baseIcon = 'folder';
        
        if (fs.existsSync(appJsonPath)) {
            try {
                const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                if (appJson.mode === 'page') {
                    baseIcon = 'file-code';
                } else if (appJson.mode === 'component') {
                    baseIcon = 'symbol-class';
                } else if (appJson.mode === 'layout') {
                    baseIcon = 'layout';
                }
            } catch (e) {
                // JSON 파싱 실패 시 기본 아이콘
            }
        }

        // 활성화된 경우 체크 아이콘과 기본 아이콘을 함께 표시하기 위해 체크 아이콘 사용
        if (this.isActive) {
            return new vscode.ThemeIcon('check');
        }
        
        return new vscode.ThemeIcon(baseIcon);
    }

    get contextValue() {
        return 'wizAppComponent';
    }
}

class AppTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.activeComponentPath = null;
        this.selectedProjectPath = null;
    }

    setSelectedProject(projectPath) {
        this.selectedProjectPath = projectPath;
        this.refresh();
    }

    setActiveComponentPath(componentPath) {
        this.activeComponentPath = componentPath;
        this.refresh();
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    /**
     * 디렉토리가 WIZ 구조인지 확인
     * WIZ 구조: project/, config/, plugin/, ide/, public/ 중 일부가 존재
     */
    isWizStructure(directoryPath) {
        const wizIndicators = ['project', 'config', 'plugin', 'ide', 'public'];
        let foundCount = 0;
        
        try {
            const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && wizIndicators.includes(entry.name)) {
                    foundCount++;
                }
            }
            // project 디렉토리가 필수이고, 다른 지표 중 하나 이상이 있으면 WIZ 구조
            const hasProject = fs.existsSync(path.join(directoryPath, 'project'));
            return hasProject && foundCount >= 2;
        } catch (error) {
            return false;
        }
    }

    /**
     * 디렉토리 내에서 WIZ 구조를 찾기 (재귀적으로 상위 디렉토리도 확인)
     */
    findWizRoot(startPath) {
        let currentPath = startPath;
        const rootPath = path.parse(startPath).root;
        
        while (currentPath !== rootPath) {
            if (this.isWizStructure(currentPath)) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
        }
        
        return null;
    }

    async getChildren(element) {
        if (!element) {
            // 선택된 프로젝트가 없으면 빈 배열 반환
            if (!this.selectedProjectPath) {
                return Promise.resolve([]);
            }

            const appPath = path.join(this.selectedProjectPath, 'src', 'app');
            if (!fs.existsSync(appPath)) {
                return Promise.resolve([]);
            }

            // 프로젝트명 추출
            const projectName = path.basename(this.selectedProjectPath);
            
            // 선택된 프로젝트의 app 구성요소들만 반환
            const components = this.getAppComponents(appPath, projectName, null);
            return Promise.resolve(components);
        }

        return Promise.resolve([]);
    }

    getAppComponents(appPath, projectName, workspaceName) {
        const components = [];
        
        if (!fs.existsSync(appPath)) {
            return components;
        }

        try {
            const entries = fs.readdirSync(appPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('__')) {
                    const componentPath = path.join(appPath, entry.name);
                    const appJsonPath = path.join(componentPath, 'app.json');
                    
                    let label = entry.name;
                    if (fs.existsSync(appJsonPath)) {
                        try {
                            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                            if (appJson.title) {
                                label = `${entry.name} - ${appJson.title}`;
                            }
                        } catch (e) {
                            // JSON 파싱 실패 시 이름만 사용
                        }
                    }

                    // 워크스페이스가 여러 개일 경우 워크스페이스명도 표시
                    const displayLabel = workspaceName && vscode.workspace.workspaceFolders.length > 1
                        ? `[${workspaceName}/${projectName}] ${label}`
                        : `[${projectName}] ${label}`;

                    // 현재 활성화된 구성요소인지 확인
                    const isActive = this.activeComponentPath && 
                        path.normalize(this.activeComponentPath) === path.normalize(componentPath);

                    const component = new AppComponent(
                        entry.name,
                        componentPath,
                        displayLabel,
                        isActive
                    );
                    components.push(component);
                }
            }
        } catch (error) {
            console.error(`Error reading ${appPath}:`, error);
        }

        // 이름순으로 정렬
        components.sort((a, b) => a.name.localeCompare(b.name));
        
        return components;
    }

    getComponentFiles(componentPath) {
        const files = [];
        const commonFiles = ['view.html', 'view.ts', 'view.scss', 'api.py', 'socket.py', 'app.json'];
        
        for (const fileName of commonFiles) {
            const filePath = path.join(componentPath, fileName);
            if (fs.existsSync(filePath)) {
                files.push(filePath);
            }
        }

        // 나머지 파일들도 추가
        const entries = fs.readdirSync(componentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                const filePath = path.join(componentPath, entry.name);
                if (!files.includes(filePath)) {
                    files.push(filePath);
                }
            }
        }

        return files;
    }

    /**
     * 구성요소의 pug/html 파일만 반환
     */
    getComponentViewFiles(componentPath) {
        const files = [];
        const viewFiles = ['view.pug', 'view.html'];
        
        for (const fileName of viewFiles) {
            const filePath = path.join(componentPath, fileName);
            if (fs.existsSync(filePath)) {
                files.push(filePath);
            }
        }

        // view.pug가 없으면 view.html만 반환
        if (files.length === 0) {
            const htmlPath = path.join(componentPath, 'view.html');
            if (fs.existsSync(htmlPath)) {
                files.push(htmlPath);
            }
        }

        return files;
    }

    /**
     * 파일 경로에서 구성요소 경로 찾기
     * 예: /path/to/project/main/src/app/page.main/view.html -> /path/to/project/main/src/app/page.main
     */
    findComponentPath(filePath) {
        const normalizedPath = path.normalize(filePath);
        const parts = normalizedPath.split(path.sep);
        
        // src/app/... 패턴 찾기
        const appIndex = parts.findIndex((part, index) => 
            part === 'app' && index > 0 && parts[index - 1] === 'src'
        );
        
        if (appIndex === -1) {
            return null;
        }

        // app 다음의 디렉토리가 구성요소
        if (appIndex + 1 < parts.length) {
            const componentName = parts[appIndex + 1];
            const componentPath = parts.slice(0, appIndex + 2).join(path.sep);
            
            // 구성요소 디렉토리가 실제로 존재하는지 확인
            if (fs.existsSync(componentPath) && fs.statSync(componentPath).isDirectory()) {
                return componentPath;
            }
        }

        return null;
    }

    /**
     * 구성요소 정보 가져오기 (이름, 제목 등)
     */
    getComponentInfo(componentPath) {
        if (!componentPath || !fs.existsSync(componentPath)) {
            return null;
        }

        const componentName = path.basename(componentPath);
        const appJsonPath = path.join(componentPath, 'app.json');
        
        let title = componentName;
        let projectName = '';
        
        // 프로젝트명 찾기 (project/main/src/app/... 에서 main 추출)
        const parts = componentPath.split(path.sep);
        const projectIndex = parts.findIndex(part => part === 'project');
        if (projectIndex !== -1 && projectIndex + 1 < parts.length) {
            projectName = parts[projectIndex + 1];
        }

        // app.json에서 제목 가져오기
        if (fs.existsSync(appJsonPath)) {
            try {
                const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                if (appJson.title) {
                    title = appJson.title;
                }
            } catch (e) {
                // JSON 파싱 실패 시 기본값 사용
            }
        }

        return {
            name: componentName,
            title: title,
            projectName: projectName
        };
    }

    /**
     * 구성요소 경로에서 모든 관련 파일들 반환 (view 파일 제외)
     */
    getComponentRelatedFiles(componentPath) {
        const files = [];
        const priorityFiles = ['view.ts', 'view.scss', 'api.py', 'socket.py', 'app.json'];
        
        // 우선순위 파일들
        for (const fileName of priorityFiles) {
            const filePath = path.join(componentPath, fileName);
            if (fs.existsSync(filePath)) {
                files.push({
                    path: filePath,
                    name: fileName,
                    label: this.getFileLabel(fileName)
                });
            }
        }

        // 나머지 파일들
        try {
            const entries = fs.readdirSync(componentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = path.join(componentPath, entry.name);
                    const fileName = entry.name;
                    
                    // 이미 추가된 파일이거나 view.pug/html이면 제외
                    if (files.some(f => f.path === filePath) || 
                        fileName === 'view.pug' || fileName === 'view.html') {
                        continue;
                    }
                    
                    files.push({
                        path: filePath,
                        name: fileName,
                        label: this.getFileLabel(fileName)
                    });
                }
            }
        } catch (error) {
            console.error(`Error reading ${componentPath}:`, error);
        }

        return files;
    }

    getFileLabel(fileName) {
        const labels = {
            'view.ts': 'Component',
            'view.scss': 'SCSS',
            'api.py': 'API',
            'socket.py': 'Socket',
            'app.json': 'Info'
        };
        return labels[fileName] || fileName;
    }
}

module.exports = { AppTreeProvider, AppComponent };
