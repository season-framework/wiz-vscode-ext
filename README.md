# WIZ Extension

VSCode/Cursor용 WIZ 프로젝트 편집 Extension입니다.

WIZ 프로젝트의 `src/app` 디렉토리 내 구성요소들을 탐색기에서 깔끔하게 관리할 수 있도록 도와줍니다.

## 기능

- **WIZ 구조 자동 인식**: `project/`, `config/`, `plugin/` 등이 있는 디렉토리 구조를 자동으로 WIZ 구조로 인식
- **WIZ App Components 뷰**: `project/*/src/app` 디렉토리의 구성요소들을 하나의 노드로 표시
- **구성요소 파일 자동 열기**: 구성요소를 클릭하면 해당 구성요소의 모든 파일을 탭으로 자동 열기
- **프로젝트별 구분**: main, dev 등 여러 프로젝트의 구성요소를 프로젝트명으로 구분하여 표시
- **아이콘 구분**: page, component, layout 등 타입에 따라 다른 아이콘 표시

## 프로젝트 구조

```
code-ext/
├── src/
│   ├── extension.js         # 메인 extension 코드
│   └── appTreeProvider.js  # App Components Tree Provider
├── .vscode/
│   ├── tasks.json          # 빌드 작업 설정
│   └── launch.json         # 디버깅 설정
├── package.json            # Extension manifest
└── README.md
```

## 사용 방법

### 1. Extension 실행

**디버깅 모드로 실행 (권장)**:
1. VSCode/Cursor에서 이 프로젝트를 엽니다
2. `F5` 키를 누르거나 디버그 패널에서 "Run Extension" 선택
3. 새로운 Extension Development Host 창이 열립니다
4. 새 창에서 탐색기 패널에 "WIZ App Components" 뷰가 표시됩니다

### 2. WIZ App Components 뷰 사용

1. **탐색기 패널**에서 "WIZ App Components" 섹션을 찾습니다
2. Extension이 자동으로 워크스페이스에서 WIZ 구조를 찾아 표시합니다
   - WIZ 구조는 `project/` 디렉토리와 함께 `config/`, `plugin/`, `ide/`, `public/` 중 일부가 존재하면 인식됩니다
   - 디렉토리 이름이 "wiz"일 필요는 없습니다
3. 각 구성요소는 다음과 같이 표시됩니다:
   - `[프로젝트명] 구성요소명 - 제목`
   - 예: `[main] page.main - Main Page`
4. **구성요소 클릭**: 구성요소를 클릭하면 해당 구성요소의 모든 파일(view.html, view.ts, api.py 등)이 탭으로 열립니다
5. **새로고침**: 뷰 상단의 새로고침 버튼을 클릭하여 구성요소 목록을 업데이트합니다

### 3. Extension 패키징 및 설치

#### 패키징

```bash
# vsce 설치 (한 번만)
npm install -g @vscode/vsce

# Extension 패키징 (.vsix 파일 생성)
vsce package
```

#### 설치

1. VSCode/Cursor에서 `Ctrl+Shift+X` (또는 `Cmd+Shift+X` on Mac)로 Extensions 뷰 열기
2. `...` 메뉴에서 "Install from VSIX..." 선택
3. 생성된 `.vsix` 파일 선택

또는 명령줄에서:

```bash
code --install-extension wiz-extension-0.0.1.vsix
```

## WIZ 프로젝트 구조 이해

WIZ 프로젝트는 다음과 같은 디렉토리 구조를 가집니다 (디렉토리 이름이 "wiz"일 필요는 없습니다):

```
프로젝트 루트/
├── project/          # 필수: 프로젝트 디렉토리
│   ├── main/        # main 프로젝트
│   │   ├── config/  # 설정 파일들
│   │   └── src/     # 소스 코드
│   │       └── app/ # App 구성요소들 (이 Extension이 관리)
│   │           ├── page.main/
│   │           ├── component.card/
│   │           └── ...
│   └── dev/         # dev 프로젝트
│       └── ...
├── config/          # WIZ 구조 지표 (선택)
├── plugin/          # WIZ 구조 지표 (선택)
├── ide/             # WIZ 구조 지표 (선택)
└── public/          # WIZ 구조 지표 (선택)
```

**WIZ 구조 자동 인식**: Extension은 `project/` 디렉토리와 함께 `config/`, `plugin/`, `ide/`, `public/` 중 일부가 존재하면 자동으로 WIZ 구조로 인식합니다. 디렉토리 이름이 "wiz"일 필요는 없으며, 워크스페이스 루트나 하위 디렉토리 어디에 있든 자동으로 찾습니다.

각 구성요소 디렉토리에는 다음과 같은 파일들이 포함될 수 있습니다:
- `view.html` - HTML 템플릿
- `view.ts` - TypeScript 컴포넌트
- `view.scss` - 스타일시트
- `api.py` - Python API
- `socket.py` - WebSocket 핸들러
- `app.json` - 구성요소 메타데이터

## 주요 파일 설명

### src/extension.js

Extension의 메인 진입점입니다.
- `activate()`: Extension 활성화 시 Tree View Provider 등록
- `deactivate()`: Extension 비활성화 시 정리 작업

### src/appTreeProvider.js

WIZ App Components를 표시하는 Tree Data Provider입니다.
- `getChildren()`: 프로젝트의 app 구성요소 목록 반환
- `getComponentFiles()`: 특정 구성요소의 파일 목록 반환
- `getAppComponents()`: `src/app` 디렉토리에서 구성요소 탐색

### package.json

Extension의 manifest 파일입니다.
- `contributes.views`: "WIZ App Components" 뷰 등록
- `contributes.commands`: 구성요소 열기, 새로고침 명령어 등록
- `activationEvents`: 뷰가 열릴 때 Extension 활성화

## 개발 팁

### 구성요소 타입별 아이콘

`app.json`의 `mode` 필드에 따라 다른 아이콘이 표시됩니다:
- `page`: 파일 아이콘
- `component`: 클래스 아이콘
- `layout`: 레이아웃 아이콘

### 파일 자동 열기 순서

구성요소를 클릭하면 다음 순서로 파일이 열립니다:
1. `view.html` (`view.pug`)
2. `view.ts`
3. `view.scss`
4. `api.py`
5. `socket.py`
6. `app.json`
7. 기타 파일들

## Todo

- Create Project

## 참고 자료

- [VSCode Extension API 문서](https://code.visualstudio.com/api)
- [Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Extension 개발 가이드](https://code.visualstudio.com/api/get-started/your-first-extension)
