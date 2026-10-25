# NutriGlimpse

*Know your food. Understand your choices.*

NutriGlimpse is a iPhone App which is meant for seniors and moms as a health and nutrition grocery companion. To help user make better food choices it provides easy to use interface through which user can find out whether a given product is healthy given their circumstances. It identifies foods from product photos, explains general nutrition considerations, and suggests alternatives with information about availability in the current store or nearby store. 
It also includes a feature called ShelfScan which can scan a grocery shelf or part of a shelf and rank products in that shelf according to their health credentials. 

This is a **private Beta 0 development repository**. Current status, acceptance evidence and open issues live in the [implementation project plan](docs/ImplementationProjectPlanDocument.md). Build **0.1.0 (23)** is available to the existing owner TestFlight group. Availability is not a claim of physical-device acceptance or validated nutrition accuracy.

## Repository layout

| Directory | Contents |
| --- | --- |
| `apps/mobile` | Expo / React Native application; native Swift and Android modules |
| `apps/service` | TypeScript backend, provider integrations, streaming and diagnostics |
| `packages/core` | Shared types, food comparisons, storage contracts and tests |
| `ops` | Setup, build, import, validation and operational scripts |
| `data` | Versioned reference data and published guidance |
| `docs` | Requirements, implementation design, project plan and release history |
| `vendor` | Vendored dependency patch with its existing license |

## Development

Use **Node.js 24** and npm. Python 3 is required for the full check suite.

```sh
npm ci
npm run web
npm run check
```

`npm run service` starts the development service; production provider configuration is separate. Tests do not require copying live credentials or personal records into the repository. The standard check command includes TypeScript, lint, core/service tests, input checks and UI scenarios.

Live development and the backend remain on **project-server**. [Remote operations](docs/07-remote-development.md) describes that environment. Some historical operational scripts deliberately reference that server's absolute project path; review them before running on another machine. Native iPhone builds require the documented Mac/Xcode or cloud build route, signing access and separately provisioned detector assets.

## Current scan behavior

- A normal product photo goes through several processing. It goes through OCR decoding on phone and that is used to query OpenFood/USDA. The photos are also sent to LLM using the approved shopper prompt, which includes user dietary preferences and health information. Results stream progressively.
- Shopper health details and preferences are shared only through the implemented explicit consent path. General food guidance is not a medical recommendation but a healthy food recommendation.
- On iPhone, Shelf Camera detects full packages locally using Apple Vision capabilities, checks duplicates and creates grids of up to 16 crops for further review.
- Store names and available aisle evidence are shown when returned. Catalog membership or an AI suggestion does not establish branch stock.
- USDA and Open Food Facts provide additional reference checks. 

## Configuration, assets and licenses

The repository excludes credentials, signing material, local databases, retained scan responses, build outputs and separately managed detector binaries/test photographs. All application and detector integration source is included. A clean clone needs external detector assets restored before full native shelf testing. See [GitHub setup and exclusions](docs/GitHub-Repository-Setup.md) and the [asset checksums](docs/Repository-External-Assets.sha256).

Private GitHub hosting does not grant a new open-source license. Existing third-party license/attribution notices remain applicable; detector redistribution questions remain open. Public release requires a separate review of source, documentation, data, artwork and model rights.

## Read next

- [Requirements](docs/01-requirements-specification.md)
- [Design and implementation](docs/02-design-and-implementation-specification.md)
- [Current project plan](docs/ImplementationProjectPlanDocument.md)
- [Shared prompt, field rules and validation](docs/85-nutriglimpse-shared-prompt-and-field-rules.md)
- [Build 23 release](docs/nutriglimpse-build23-artwork-release-2026-10-25.md)

Older documents preserve historical decisions and may describe superseded behavior. The current plan is the status authority.
