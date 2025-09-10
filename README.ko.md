<div align="center">
  <img src="docs/images/figma-flutter-mcp.png" alt="테마 설정 예시" style="max-width: 100%; height: auto;">
  
  <br>

  <h1>Figma to Flutter MCP 서버</h1>
  <h3>Figma의 풍부한 데이터를 코딩 에이전트에서 활용하세요.<br/>Flutter 방식으로 디자인을 구현하세요!</h3>
  <a href="https://npmcharts.com/compare/figma-flutter-mcp?interval=30">
    <img alt="주간 다운로드" src="https://img.shields.io/npm/dm/figma-flutter-mcp.svg">
  </a>
  <a href="https://github.com/mhmzdev/figma-flutter-mcp/blob/main/LICENSE">
    <img alt="MIT 라이선스" src="https://img.shields.io/github/license/mhmzdev/figma-flutter-mcp" />
  </a>
  <a href="https://twitter.com/mhmzdev">
    <img alt="Twitter" src="https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Fmhmzdev&label=%40mhmzdev" />
  </a>
</div>
<br>

Cursor(커서) 또는 기타 AI 기반 도구를 사용하여 [MCP 서버](https://modelcontextprotocol.io/)를 통해 Figma의 풍부한 파일, 데이터, 컴포넌트 등을 활용하세요.

## 📋 목차

- [🎥 비디오 데모](#-비디오-데모)
- [📝 시작하기](#-시작하기)
- [📚 작동 방식](#-작동-방식--자세히-보기)
- [🛠️ 사용법](#-사용법)
  - [🔑 Figma API 키](#-figma-api-키)
  - [🏹 Cursor에서 MCP 설정](#-cursor에서-mcp-설정)
  - [🚀 로컬 테스트 빠른 시작](#-로컬-테스트-빠른-시작)
- [🧱 기본 워크플로우](#-기본-워크플로우)
  - [🤖 AI 코딩 에이전트 도움말](#-ai-코딩-에이전트-도움말)
  - [⚠️ 왜 SVG 에셋은 화면 생성에서 작동하지 않나요?](#-왜-svg-에셋은-화면-생성에서-작동하지-않나요)
- [🧰 MCP 도구](#-mcp-도구)
- [⚠️ 고지사항](#-고지사항)
- [🙌🏼 감사의 말](#-감사의-말)
- [🧱 기타 프레임워크](#-기타-프레임워크)
- [🔑 라이선스](#-라이선스)
- [🙋‍♂️ 작성자](#-작성자)
  - [Muhammad Hamza](#muhammad-hamza)


## 🎥 비디오 데모
Figma Flutter MCP의 거의 모든 기능을 실제 Figma 디자인으로 시연했습니다.
- 영어: https://youtu.be/lJlfOfpl2sI
- 우르두/힌디: https://youtu.be/mepPWpIZ61M

## 📝 [시작하기](docs/getting-started.md)
자세한 시작 가이드는 [getting started](docs/getting-started.md) 문서를 참고하거나, 빠르게 확인하려면 [데모 영상](https://youtu.be/lJlfOfpl2sI)을 보세요. 첫 릴리스이므로 개선의 여지가 많습니다. 무엇을 개선하거나 작업할 수 있는지 보려면 [issues](https://github.com/mhmzdev/figma-flutter-mcp/issues)를 확인해 주세요.

## 📚 작동 방식 | [자세히 보기](docs/figma-flutter-mcp.md)
1. [컴포넌트/위젯](src/extractors/components/)
- ✅ Figma 노드 데이터 추출: 레이아웃, 스타일, 크기, 색상, 텍스트 콘텐츠 등
- ✅ 구조 분석: 자식 요소, 중첩 컴포넌트, 시각적 중요도
- ✅ 가이드 제공: Flutter 위젯 및 구현 패턴 제안
- ❌ 실제 Flutter 코드 파일은 생성하지 않음

2. [스크린](src/extractors/screens/)
- ✅ 스크린 메타데이터 추출: 기기 유형, 방향, 크기
- ✅ 섹션 식별: 헤더, 푸터, 내비게이션, 콘텐츠 영역
- ✅ 내비게이션 분석: 탭 바, 앱 바, 드로어, 내비게이션 요소
- ✅ Scaffold 구성 가이드: Flutter 스크린 구조 제안
- ❌ 실제 Flutter 스크린은 생성하지 않음

이 도구는 AI가 Flutter 코드를 작성하도록 돕는 역할입니다. 즉, 프롬프트를 더 잘 작성할수록 더 좋은 결과를 얻을 수 있습니다.

## 🛠️ 사용법
다음 단계는 최소한의 사용 및 설정 방법을 보여줍니다:

### 🔑 Figma API 키
이 서버를 사용하려면 Figma 액세스 토큰이 필요합니다. Figma API 액세스 토큰 생성 방법은 [여기](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens)에서 확인할 수 있습니다.

### 🏹 Cursor에서 MCP 설정
FIGMA API KEY가 준비되면, Cursor에서 MCP를 다음과 같이 설정합니다:
1. CMD + Shift + P (Windows는 Ctrl)
2. "Open MCP Settings" 입력
3. "Add new MCP" 클릭
4. 아래 JSON 객체를 붙여넣기

#### MacOS/Linux
```
{
  "mcpServers": {
    "Figma Flutter MCP": {
      "command": "npx",
      "args": ["-y", "figma-flutter-mcp", "--figma-api-key=YOUR-API-KEY", "--stdio"]
    }
  }
}
```
#### Windows
```
{
  "mcpServers": {
    "Figma Flutter MCP": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "figma-flutter-mcp", "--figma-api-key=YOUR-API-KEY", "--stdio"]
    }
  }
}
```

> 참고: 이 MCP를 `npm` 패키지로 설치했다면 최신 버전을 유지하세요. 때때로 이전 버전이 캐시되어 "도구 호출을 사용할 수 없음" 또는 "Figma API 키 설정이 작동하지 않음" 같은 오류가 계속 발생할 수 있습니다.

### 🚀 로컬 테스트 빠른 시작
로컬 설정 시, 여러분의 로컬 서버와 버전이 동기화되어 있는지 확인하세요. 가끔 `npm i`가 전역으로 서버를 설치하여 로컬 변경 사항을 덮어써 업데이트가 반영되지 않을 수 있습니다.

#### 0. 선행 조건(Prerequisites)
- Node.js 18+
- Figma API 키(액세스 토큰)
- MCP를 지원하는 Cursor AI IDE
- Flutter SDK

#### 1. 레포지토리 클론
```
# 프로젝트 클론 또는 다운로드
git clone <your-repo-url> figma-flutter-mcp
cd figma-flutter-mcp

# 의존성 설치
npm install
```
#### 2. 설정
`.env`를 사용해 다양한 값을 설정할 수 있습니다. [.env.example](.env.example)를 참고하세요.
#### MacOS/Linux
```
{
  "mcpServers": {
    "figma-flutter-mcp": {
      "command": "node",
      "args": [
        "/Path/to/figma-flutter-mcp/dist/server.mjs",
        "--figma-api-key=YOUR_API_KEY",
        "--stdio"
      ]
    }
  }
}
```
#### Windows
```
{
  "mcpServers": {
    "figma-flutter-mcp": {
      "command": "node",
      "args": [
        "/Path/to/figma-flutter-mcp/dist/server.mjs",
        "--figma-api-key=YOUR_API_KEY",
        "--stdio"
      ]
    }
  }
}
```
> 참고: 위 JSON을 현재 프로젝트에서만 사용하려면 `.cursor-mcp/config.json`에 설정하세요. 단, API_KEY가 포함되므로 반드시 `.gitignore`에 추가하여 버전에 포함되지 않도록 하세요.

#### 3. 빌드 & 실행
```
# 개발 모드(자동 재시작)
npm run dev

# 프로덕션 모드
npm run build
```
이제 MCP 설정에서 서버가 실행 중인지, 도구가 사용 가능한지 확인할 수 있습니다.

## 🧱 기본 워크플로우
### 🤖 AI 코딩 에이전트 도움말
더 나은 결과를 위해 사용 중인 AI 코딩 에이전트에 맞춰 다음 파일에 몇 가지 지침을 설정할 수 있습니다:
- Cursor: `.cursor/rules/fluttering.mdc`
- Claude: `CLAUDE.md`
- Gemini CLI: `GEMINI.md`

이렇게 하면 AI 에이전트가 MCP 출력물을 활용해 Flutter 코드가 프로젝트 요구 사항과 구조에 맞도록 보장합니다. 제가 테스트에 사용한 [Cursor 규칙 예시](docs/cursor_rules_example.md)도 참고해 보세요.

1. **테마 & 타이포그래피 설정**: 가장 효율적인 방법은 Figma에 테마 색상과 타이포그래피 샘플이 있는 두 개의 프레임을 두는 것입니다. 예시:

![테마 설정 예시](docs/images/theme-frame.png)
![타이포그래피 설정 예시](docs/images/text-style-frame.png)

- Figma 데스크톱: 프레임 선택 후 CMD + L
- Figma 웹: 프레임 선택 후 URL 복사

> 💡 힌트: 유효한 URL에는 FILE ID와 NODE ID 파라미터가 포함됩니다.

```
"<figma_link>에서 Flutter 테마를 설정하세요. Colors와 Typography를 포함합니다."
```

2. **위젯 생성**: 가장 효율적인 방법은 Figma의 COMPONENTS를 사용하는 것입니다. 예시:

![버튼](docs/images/button.png)

이 예시는 8개의 변형(variants)을 가지고 있습니다. 변형을 사용할지 여부를 프롬프트로 지정할 수 있습니다.
```
"이 위젯을 Flutter로 생성하세요 <figma_link>. 지금은 2개의 변형만 설정하고, 코드 가독성을 위해 파일을 더 작은 단위로 나눠주세요."
```
만약 Figma에 COMPONENTS가 없다면, FRAME을 사용해도 됩니다. 이 프레임을 위젯으로 만들고 싶다고 알려주면 나머지는 도구가 처리합니다.

3. **전체 스크린 생성**: IMAGE ASSETS가 있으면 `assets/`에 내보내고 `pubspec.yaml`에 추가합니다.
```
"이 Figma 링크로 전체 스크린을 생성하세요 <figma_link>. 코드 가독성을 위해 파일을 더 작은 단위로 나눠주세요."
```
4. **에셋 내보내기**:
- 이미지 에셋: 스크린 생성 시 자동으로 작동합니다.
```
"Figma에서 이 이미지 에셋을 내보내세요 <figma_link>"
```
- SVG 에셋: 자동으로 작동하지 않습니다. 아래 내용을 참고하세요.
```
"Figma에서 이것을 SVG 에셋으로 내보내세요: <figma_link>"
```
#### ⚠️ 왜 SVG 에셋은 화면 생성에서 작동하지 않나요?
Figma에서 벡터에는 아이콘과 펜 도구로 만든 도형이 포함되어 있어 대량 내보내기 시 의도하지 않은 노드를 함께 내보낼 수 있습니다. SVG는 별도로 내보내는 것을 권장합니다. 이 과정은 여전히 `assets/svg/` 디렉토리에 에셋을 저장하고 `pubspec.yaml`을 업데이트해 주기 때문에 많은 시간을 절약해 줍니다.

## 🧰 MCP 도구
에셋 관련:
- `export_flutter_assets`: 스크린 생성과 함께 사용하는 개별 이미지 에셋 도구
- `export_svg_flutter_assets`: SVG 에셋 내보내기 전용 도구

위젯 관련:
- `analyze_figma_component`: Figma의 type=COMPONENT 또는 사용자 지정 FRAME 분석
- `list_component_variants`: Figma의 type=COMPONENT_SET(위젯 변형) 목록
- `inspect_component_structure`: 중첩된 COMPONENTS 또는 FRAMES 구조 보기

스크린 관련:
- `analyze_full_screen`: type=FRAME 전체 스크린 분석 및 에셋(이미지) 내보내기
- `inspect_screen_structure`: 레이아웃 및 화면 구현에 필요한 정보 확인

## ⚠️ 고지사항

- **Figma 디자인**: Figma API로 노드와 상세 정보를 가져오기 때문에, 자동 레이아웃, 프레임 사용(그룹보다), 전반의 일관된 정렬 등 디자인 품질이 좋을수록 결과가 좋아집니다.
- **사용 사례**: 현재 단계에서는 확장 가능한 앱 개발보다는 MVP, 소규모 실험, 설명용 작업에 사용하는 것을 권장합니다.
- **레이트 리밋**: 과도한 사용은 Figma 레이트 리밋(예: HTTP 429)을 유발할 수 있습니다. 서버에는 백오프가 포함된 재시도가 있지만, Figma 제한을 우회하지는 않습니다. 레이트 리밋을 만나면 몇 분 기다린 뒤 요청 빈도를 줄이세요.

## 🙌🏼 감사의 말
[Graham Lipsman](https://x.com/glipsman)의 [Figma Context MCP](https://github.com/GLips/Figma-Context-MCP)에서 영감을 받아 다음 기능을 명확히 제공하는 Figma to Flutter MCP를 개발하게 되었습니다:
- 에셋 내보내기
- 색상 및 테마 설정
- 위젯 트리 및 전체 화면 빌딩

더 많은 기능이 곧 추가될 예정입니다...

## 🧱 기타 프레임워크
React, Angular, React Native, Vue 또는 기타 프레임워크용으로 개발하고 싶다면, 자세한 문서인 [Figma Framework MCP](docs/figma-framework-mcp.md)를 참고해 시작할 수 있습니다. 해당 프레임워크별 Figma MCP 서버를 진행 중인 분들을 여기에 정리해 둘 예정입니다.
- ...
- ...

## 🔑 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE.md) 파일을 확인하세요.

## 🙋‍♂️ 작성자
#### Muhammad Hamza
[![LinkedIn Link](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=linkedin&longCache=true&style=social&label=Connect
)](https://www.linkedin.com/in/mhmzdev)

제 GitHub 프로필을 팔로우하여 최신 프로젝트 업데이트를 받아보세요:

[![GitHub Follow](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=Github&longCache=true&style=social&label=Follow)](https://github.com/mhmzdev)

레포가 마음에 드셨다면 ⭐로 응원 부탁드립니다!

Copyright (c) 2025 MUHAMMAD HAMZA

---

디자인과 코드를 잇는 모든 디자이너와 개발자를 위해 ❤️로 만들었습니다.


