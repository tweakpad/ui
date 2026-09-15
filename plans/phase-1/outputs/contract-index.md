# Contract Index

Source: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, version **0.2.62**; indexed **2026-09-15**.

**P1-02 and P1-03 status: complete.** All 346 source units are indexed, their explicit dependencies resolve, every record has been semantically reviewed, and every included record has primary acceptance ownership. ISS-001 and ISS-002 are resolved.

Each MCP section is a stable source unit. A parent row preserves the section-wide context; its subsections have separate rows. Empty grouping headings are navigation context, not additional public capabilities. The managed glossary is represented as one inventory. The source remains authoritative for all properties, parts, defaults, operations, states, reasons, geometry outputs, and keys.

Dependency notation: **F** = explicit Foundation reference; **C** = explicit catalog-composition reference; **P** = explicit shared-presentation or definition authority; **I** = supporting inventory or interpretation; **Context** = containing source section; **Vocabulary** = managed definitions. The shared conformance and definition references on catalog rows identify the applicable common boundary. These references describe contract relationships rather than implementation order. The complete source and dependency audit confirmed semantic completeness, inherited relationships, and evidence ownership. The two questioned tables contain 147 valid anchor-reference nodes; ISS-001 records why an ephemeral rendering was not source evidence.

Appendix F feature exclusions apply within their containing contracts; they do not remove those contracts from this index. The excluded UI Foundation §19.10 compatibility contract remains a traceable row. See the scope dispositions and DEC-003.

## Shared Foundation contracts

Includes shared contracts, named Foundation families, advanced capabilities, and Foundation verification. Foundation capability counts must not be inferred from the number of section rows.

| ID | MCP source | Coverage category | Scope ID | Depends on | Review status | Issue IDs | Acceptance IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="con-001"></a>CON-001 | UI Foundation Specification — `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1` | foundation capability | SCOPE-001 | No explicit outbound MCP reference | clear | — | ACC-001 |
| <a id="con-002"></a>CON-002 | UI Foundation §1 | foundation capability | SCOPE-001 | Context: CON-001; F: CON-149; P: CON-187; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-003"></a>CON-003 | UI Foundation §1.1 | foundation capability | SCOPE-001 | Context: CON-002; I: CON-184; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-004"></a>CON-004 | UI Foundation §1.2 | foundation capability | SCOPE-001 | Context: CON-002; I: CON-178; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-005"></a>CON-005 | UI Foundation §2 | foundation capability | SCOPE-001 | Context: CON-001; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-006"></a>CON-006 | UI Foundation §3 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-007"></a>CON-007 | UI Foundation §3.1 | foundation capability | SCOPE-001 | Context: CON-006; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-008"></a>CON-008 | UI Foundation §3.2 | foundation capability | SCOPE-001 | Context: CON-006; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-009"></a>CON-009 | UI Foundation §4 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-010"></a>CON-010 | UI Foundation §4.1 | foundation capability | SCOPE-001 | Context: CON-009; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-011"></a>CON-011 | UI Foundation §4.2 | foundation capability | SCOPE-001 | Context: CON-009; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-012"></a>CON-012 | UI Foundation §4.3 | foundation capability | SCOPE-001 | Context: CON-009; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-013"></a>CON-013 | UI Foundation §4.4 | foundation capability | SCOPE-001 | Context: CON-009; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-014"></a>CON-014 | UI Foundation §4.5 | foundation capability | SCOPE-001 | Context: CON-009; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-015"></a>CON-015 | UI Foundation §5 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-016"></a>CON-016 | UI Foundation §5.1 | foundation capability | SCOPE-001 | Context: CON-015; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-017"></a>CON-017 | UI Foundation §5.2 | foundation capability | SCOPE-001 | Context: CON-015; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-018"></a>CON-018 | UI Foundation §5.3 | foundation capability | SCOPE-001 | Context: CON-015; I: CON-173, CON-184; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-019"></a>CON-019 | UI Foundation §5.4 | foundation capability | SCOPE-001 | Context: CON-015; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-020"></a>CON-020 | UI Foundation §5.5 | foundation capability | SCOPE-001 | Context: CON-015; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-021"></a>CON-021 | UI Foundation §6 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-022"></a>CON-022 | UI Foundation §6.1 | foundation capability | SCOPE-001 | Context: CON-021; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-023"></a>CON-023 | UI Foundation §6.2 | foundation capability | SCOPE-001 | Context: CON-021; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-024"></a>CON-024 | UI Foundation §6.3 | foundation capability | SCOPE-001 | Context: CON-021; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-025"></a>CON-025 | UI Foundation §7 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-026"></a>CON-026 | UI Foundation §7.1 | foundation capability | SCOPE-001 | Context: CON-025; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-027"></a>CON-027 | UI Foundation §7.2 | foundation capability | SCOPE-001 | Context: CON-025; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-028"></a>CON-028 | UI Foundation §7.3 | foundation capability | SCOPE-001 | Context: CON-025; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-029"></a>CON-029 | UI Foundation §8 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-030"></a>CON-030 | UI Foundation §8.1 | foundation capability | SCOPE-001 | Context: CON-029; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-031"></a>CON-031 | UI Foundation §8.2 | foundation capability | SCOPE-001 | Context: CON-029; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-032"></a>CON-032 | UI Foundation §8.3 | foundation capability | SCOPE-001 | Context: CON-029; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-033"></a>CON-033 | UI Foundation §8.4 | foundation capability | SCOPE-001 | Context: CON-029; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-034"></a>CON-034 | UI Foundation §9 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-035"></a>CON-035 | UI Foundation §9.1 | foundation capability | SCOPE-001 | Context: CON-034; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-036"></a>CON-036 | UI Foundation §9.2 | foundation capability | SCOPE-001 | Context: CON-034; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-037"></a>CON-037 | UI Foundation §9.3 | foundation capability | SCOPE-001 | Context: CON-034; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-038"></a>CON-038 | UI Foundation §9.4 | foundation capability | SCOPE-001 | Context: CON-034; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-039"></a>CON-039 | UI Foundation §10 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-040"></a>CON-040 | UI Foundation §10.1 | foundation capability | SCOPE-001 | Context: CON-039; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-041"></a>CON-041 | UI Foundation §10.2 | foundation capability | SCOPE-001 | Context: CON-039; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-042"></a>CON-042 | UI Foundation §10.3 | foundation capability | SCOPE-001 | Context: CON-039; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-043"></a>CON-043 | UI Foundation §10.4 | foundation capability | SCOPE-001 | Context: CON-039; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-044"></a>CON-044 | UI Foundation §10.5 | foundation capability | SCOPE-001 | Context: CON-039; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-045"></a>CON-045 | UI Foundation §10.6 | foundation capability | SCOPE-001 | Context: CON-039; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-046"></a>CON-046 | UI Foundation §10.7 | foundation capability | SCOPE-001 | Context: CON-039; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-047"></a>CON-047 | UI Foundation §10.7.1 | foundation capability | SCOPE-001 | Context: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-048"></a>CON-048 | UI Foundation §10.7.2 | foundation capability | SCOPE-001 | Context: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-049"></a>CON-049 | UI Foundation §10.7.3 | foundation capability | SCOPE-001 | Context: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-050"></a>CON-050 | UI Foundation §10.7.4 | foundation capability | SCOPE-001 | Context: CON-046; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-051"></a>CON-051 | UI Foundation §10.7.5 | foundation capability | SCOPE-001 | Context: CON-046; I: CON-184 | clear | — | ACC-002 |
| <a id="con-052"></a>CON-052 | UI Foundation §10.7.6 | foundation capability | SCOPE-001 | Context: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-053"></a>CON-053 | UI Foundation §10.7.7 | foundation capability | SCOPE-001 | Context: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-054"></a>CON-054 | UI Foundation §10.7.8 | foundation capability | SCOPE-001 | Context: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-055"></a>CON-055 | UI Foundation §10.8 | foundation capability | SCOPE-001 | Context: CON-039; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-056"></a>CON-056 | UI Foundation §10.9 | foundation capability | SCOPE-001 | Context: CON-039; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-057"></a>CON-057 | UI Foundation §10.10 | foundation capability | SCOPE-001 | Context: CON-039; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-058"></a>CON-058 | UI Foundation §10.11 | foundation capability | SCOPE-001 | Context: CON-039; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-059"></a>CON-059 | UI Foundation §11 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-060"></a>CON-060 | UI Foundation §11.1 | foundation capability | SCOPE-001 | Context: CON-059; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-061"></a>CON-061 | UI Foundation §11.2 | foundation capability | SCOPE-001 | Context: CON-059; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-062"></a>CON-062 | UI Foundation §11.3 | foundation capability | SCOPE-001 | Context: CON-059; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-063"></a>CON-063 | UI Foundation §11.4 | foundation capability | SCOPE-001 | Context: CON-059; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-064"></a>CON-064 | UI Foundation §11.5 | foundation capability | SCOPE-001 | Context: CON-059; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-065"></a>CON-065 | UI Foundation §12 | foundation capability | SCOPE-001 | Context: CON-001; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-066"></a>CON-066 | UI Foundation §12.1 | foundation capability | SCOPE-001 | Context: CON-065; F: CON-015, CON-014; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-067"></a>CON-067 | UI Foundation §12.2 | foundation capability | SCOPE-001 | Context: CON-065; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-068"></a>CON-068 | UI Foundation §12.3 | foundation capability | SCOPE-001 | Context: CON-065; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-069"></a>CON-069 | UI Foundation §12.4 | foundation capability | SCOPE-001 | Context: CON-065; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-070"></a>CON-070 | UI Foundation §12.5 | foundation capability | SCOPE-001 | Context: CON-065; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-071"></a>CON-071 | UI Foundation §12.6 | foundation capability | SCOPE-001 | Context: CON-065; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-072"></a>CON-072 | UI Foundation §13 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-073"></a>CON-073 | UI Foundation §13.1 | foundation capability | SCOPE-002 | Context: CON-072; F: CON-021; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-074"></a>CON-074 | UI Foundation §13.2 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-075"></a>CON-075 | UI Foundation §13.3 | foundation capability | SCOPE-002 | Context: CON-072; F: CON-021; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-076"></a>CON-076 | UI Foundation §13.4 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-077"></a>CON-077 | UI Foundation §13.5 | foundation capability | SCOPE-002 | Context: CON-072; F: CON-013; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-078"></a>CON-078 | UI Foundation §13.6 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-079"></a>CON-079 | UI Foundation §13.7 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-080"></a>CON-080 | UI Foundation §13.8 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-081"></a>CON-081 | UI Foundation §13.9 | foundation capability | SCOPE-002 | Context: CON-072; F: CON-080 | clear | — | ACC-002 |
| <a id="con-082"></a>CON-082 | UI Foundation §13.10 | composition-only exposure (Foundation authority) | SCOPE-004 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-083"></a>CON-083 | UI Foundation §13.11 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-084"></a>CON-084 | UI Foundation §13.12 | foundation capability | SCOPE-002 | Context: CON-072; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-085"></a>CON-085 | UI Foundation §14 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-086"></a>CON-086 | UI Foundation §14.1 | foundation capability | SCOPE-002 | Context: CON-085; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-087"></a>CON-087 | UI Foundation §14.2 | foundation capability | SCOPE-002 | Context: CON-085; F: CON-027 | clear | — | ACC-002 |
| <a id="con-088"></a>CON-088 | UI Foundation §14.3 | foundation capability | SCOPE-002 | Context: CON-085; F: CON-036; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-089"></a>CON-089 | UI Foundation §14.4 | foundation capability | SCOPE-002 | Context: CON-085; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-090"></a>CON-090 | UI Foundation §14.5 | foundation capability | SCOPE-002 | Context: CON-085; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-091"></a>CON-091 | UI Foundation §14.6 | foundation-only optional capability | SCOPE-005 | Context: CON-085; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-092"></a>CON-092 | UI Foundation §14.7 | foundation capability | SCOPE-002 | Context: CON-085; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-093"></a>CON-093 | UI Foundation §14.8 | foundation capability | SCOPE-002 | Context: CON-085; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-094"></a>CON-094 | UI Foundation §14.9 | foundation capability | SCOPE-002 | Context: CON-085; F: CON-017, CON-069 | clear | — | ACC-002 |
| <a id="con-095"></a>CON-095 | UI Foundation §14.10 | foundation capability | SCOPE-002 | Context: CON-085; F: CON-017, CON-036 | clear | — | ACC-002 |
| <a id="con-096"></a>CON-096 | UI Foundation §15 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-097"></a>CON-097 | UI Foundation §15.1 | foundation capability | SCOPE-002 | Context: CON-096; F: CON-064; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-098"></a>CON-098 | UI Foundation §15.2 | composition-only exposure (Foundation authority) | SCOPE-004 | Context: CON-096; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-099"></a>CON-099 | UI Foundation §15.3 | foundation capability | SCOPE-002 | Context: CON-096; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-100"></a>CON-100 | UI Foundation §15.4 | foundation capability | SCOPE-002 | Context: CON-096; F: CON-021, CON-029, CON-039, CON-059; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-101"></a>CON-101 | UI Foundation §16 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-102"></a>CON-102 | UI Foundation §16.1 | foundation capability | SCOPE-002 | Context: CON-101; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-103"></a>CON-103 | UI Foundation §16.2 | foundation capability | SCOPE-002 | Context: CON-101; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-104"></a>CON-104 | UI Foundation §16.3 | foundation capability | SCOPE-002 | Context: CON-101; F: CON-030; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-105"></a>CON-105 | UI Foundation §16.4 | foundation capability | SCOPE-002 | Context: CON-101; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-106"></a>CON-106 | UI Foundation §16.5 | foundation capability | SCOPE-002 | Context: CON-101; F: CON-032; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-107"></a>CON-107 | UI Foundation §16.6 | foundation capability | SCOPE-002 | Context: CON-101; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-108"></a>CON-108 | UI Foundation §16.7 | foundation capability | SCOPE-002 | Context: CON-101; F: CON-063; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-109"></a>CON-109 | UI Foundation §17 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-110"></a>CON-110 | UI Foundation §17.1 | foundation capability | SCOPE-002 | Context: CON-109; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-111"></a>CON-111 | UI Foundation §17.2 | foundation capability | SCOPE-002 | Context: CON-109; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-112"></a>CON-112 | UI Foundation §17.3 | foundation capability | SCOPE-002 | Context: CON-109; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-113"></a>CON-113 | UI Foundation §17.4 | foundation capability | SCOPE-002 | Context: CON-109; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-114"></a>CON-114 | UI Foundation §17.5 | foundation capability | SCOPE-002 | Context: CON-109; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-115"></a>CON-115 | UI Foundation §17.6 | composition-only exposure (Foundation authority) | SCOPE-004 | Context: CON-109; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-116"></a>CON-116 | UI Foundation §17.7 | foundation capability | SCOPE-002 | Context: CON-109; F: CON-104, CON-017; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-117"></a>CON-117 | UI Foundation §18 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-118"></a>CON-118 | UI Foundation §18.1 | foundation capability | SCOPE-002 | Context: CON-117; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-119"></a>CON-119 | UI Foundation §18.2 | foundation-only optional capability | SCOPE-005 | Context: CON-117; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-120"></a>CON-120 | UI Foundation §18.3 | foundation capability | SCOPE-002 | Context: CON-117; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-121"></a>CON-121 | UI Foundation §18.4 | foundation capability | SCOPE-002 | Context: CON-117; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-122"></a>CON-122 | UI Foundation §18.5 | foundation capability | SCOPE-002 | Context: CON-117; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-123"></a>CON-123 | UI Foundation §18.6 | foundation capability | SCOPE-002 | Context: CON-117; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-124"></a>CON-124 | UI Foundation §18.7 | foundation capability | SCOPE-002 | Context: CON-117; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-125"></a>CON-125 | UI Foundation §18.8 | foundation capability | SCOPE-002 | Context: CON-117; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-126"></a>CON-126 | UI Foundation §18.9 | foundation capability | SCOPE-002 | Context: CON-117; F: CON-121 | clear | — | ACC-002 |
| <a id="con-127"></a>CON-127 | UI Foundation §19 | foundation capability | SCOPE-002 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-128"></a>CON-128 | UI Foundation §19.1 | foundation capability | SCOPE-002 | Context: CON-127; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-129"></a>CON-129 | UI Foundation §19.1.1 | foundation capability | SCOPE-002 | Context: CON-128; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-130"></a>CON-130 | UI Foundation §19.1.2 | foundation capability | SCOPE-002 | Context: CON-128; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-131"></a>CON-131 | UI Foundation §19.1.3 | foundation capability | SCOPE-002 | Context: CON-128; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-132"></a>CON-132 | UI Foundation §19.2 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-133"></a>CON-133 | UI Foundation §19.3 | foundation capability | SCOPE-002 | Context: CON-127; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-134"></a>CON-134 | UI Foundation §19.4 | foundation capability | SCOPE-002 | Context: CON-127; F: CON-030; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-135"></a>CON-135 | UI Foundation §19.5 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-136"></a>CON-136 | UI Foundation §19.6 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-137"></a>CON-137 | UI Foundation §19.7 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-138"></a>CON-138 | UI Foundation §19.8 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-139"></a>CON-139 | UI Foundation §19.9 | foundation capability | SCOPE-002 | Context: CON-127; F: CON-046; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-140"></a>CON-140 | UI Foundation §19.10 | optional Foundation compatibility capability (excluded) | SCOPE-013 | Context: CON-127; Vocabulary: CON-346 | clear | — | not applicable: excluded |
| <a id="con-141"></a>CON-141 | UI Foundation §19.11 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-142"></a>CON-142 | UI Foundation §19.12 | foundation capability | SCOPE-002 | Context: CON-127; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-143"></a>CON-143 | UI Foundation §19.13 | foundation capability | SCOPE-002 | Context: CON-127; F: CON-021; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-144"></a>CON-144 | UI Foundation §19.14 | foundation capability | SCOPE-002 | Context: CON-127; F: CON-013; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-145"></a>CON-145 | UI Foundation §19.15 | foundation capability | SCOPE-002 | Context: CON-127; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-146"></a>CON-146 | UI Foundation §19.16 | foundation capability | SCOPE-002 | Context: CON-127; F: CON-122 | clear | — | ACC-002 |
| <a id="con-147"></a>CON-147 | UI Foundation §19.17 | foundation capability | SCOPE-002 | Context: CON-127; F: CON-017, CON-014, CON-105, CON-104 | clear | — | ACC-002 |
| <a id="con-148"></a>CON-148 | UI Foundation §19.18 | foundation capability | SCOPE-002 | Context: CON-127; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-149"></a>CON-149 | UI Foundation §20 | foundation capability | SCOPE-001 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-002 |
| <a id="con-150"></a>CON-150 | UI Foundation §20.1 | foundation capability | SCOPE-001 | Context: CON-149; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-151"></a>CON-151 | UI Foundation §20.2 | foundation capability | SCOPE-001 | Context: CON-149; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-152"></a>CON-152 | UI Foundation §20.3 | foundation capability | SCOPE-001 | Context: CON-149; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-153"></a>CON-153 | UI Foundation §20.4 | foundation capability | SCOPE-001 | Context: CON-149; Vocabulary: CON-346 | clear | — | ACC-002 |
| <a id="con-154"></a>CON-154 | UI Foundation §20.5 | foundation capability | SCOPE-001 | Context: CON-149; F: CON-002, CON-149; I: CON-155, CON-159, CON-165, CON-170, CON-173, CON-184; Vocabulary: CON-346 | clear | — | ACC-002 |

## Shared presentation and composition contracts

| ID | MCP source | Coverage category | Scope ID | Depends on | Review status | Issue IDs | Acceptance IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="con-187"></a>CON-187 | UI Component Library Specification — `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3` | shared presentation and composition contract | SCOPE-006 | No explicit outbound MCP reference | clear | — | ACC-001 |
| <a id="con-188"></a>CON-188 | UI Component Library §1 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-189"></a>CON-189 | UI Component Library §1.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-188; F: CON-010, CON-013, CON-015, CON-021, CON-025, CON-029, CON-034, CON-039, CON-059, CON-065, CON-127, CON-072, CON-117; Live reference audit: ISS-001 | clear | ISS-001 (resolved) | ACC-006 |
| <a id="con-190"></a>CON-190 | UI Component Library §1.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-188; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-191"></a>CON-191 | UI Component Library §1.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-188; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-192"></a>CON-192 | UI Component Library §2 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-193"></a>CON-193 | UI Component Library §3 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-194"></a>CON-194 | UI Component Library §3.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-193; F: CON-008 | clear | — | ACC-006 |
| <a id="con-195"></a>CON-195 | UI Component Library §3.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-193; F: CON-007 | clear | — | ACC-006 |
| <a id="con-196"></a>CON-196 | UI Component Library §4 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-197"></a>CON-197 | UI Component Library §4.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-196; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-198"></a>CON-198 | UI Component Library §4.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-196; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-199"></a>CON-199 | UI Component Library §4.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-196; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-200"></a>CON-200 | UI Component Library §5 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; F: CON-014, CON-026; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-201"></a>CON-201 | UI Component Library §5.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-200; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-202"></a>CON-202 | UI Component Library §5.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-200; P: CON-206 | clear | — | ACC-006 |
| <a id="con-203"></a>CON-203 | UI Component Library §5.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-200; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-204"></a>CON-204 | UI Component Library §5.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-200; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-205"></a>CON-205 | UI Component Library §5.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-200; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-206"></a>CON-206 | UI Component Library §5.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-200; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-207"></a>CON-207 | UI Component Library §6 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-208"></a>CON-208 | UI Component Library §6.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-207; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-209"></a>CON-209 | UI Component Library §6.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-207; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-210"></a>CON-210 | UI Component Library §6.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-207; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-211"></a>CON-211 | UI Component Library §6.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-207; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-212"></a>CON-212 | UI Component Library §6.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-207; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-213"></a>CON-213 | UI Component Library §7 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-214"></a>CON-214 | UI Component Library §7.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-213; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-215"></a>CON-215 | UI Component Library §7.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-213; F: CON-010; Vocabulary: CON-346 | clear | ISS-002 (resolved) | ACC-006 |
| <a id="con-216"></a>CON-216 | UI Component Library §7.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-213; Vocabulary: CON-346 | clear | ISS-002 (resolved) | ACC-006 |
| <a id="con-217"></a>CON-217 | UI Component Library §7.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-213; F: CON-032, CON-033, CON-013 | clear | — | ACC-006 |
| <a id="con-218"></a>CON-218 | UI Component Library §8 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-219"></a>CON-219 | UI Component Library §8.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-220"></a>CON-220 | UI Component Library §8.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; F: CON-026 | clear | — | ACC-006 |
| <a id="con-221"></a>CON-221 | UI Component Library §8.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-222"></a>CON-222 | UI Component Library §8.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-223"></a>CON-223 | UI Component Library §8.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-224"></a>CON-224 | UI Component Library §8.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-225"></a>CON-225 | UI Component Library §8.7 | shared presentation and composition contract | SCOPE-006 | Context: CON-218; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-226"></a>CON-226 | UI Component Library §9 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-227"></a>CON-227 | UI Component Library §9.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-226; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-228"></a>CON-228 | UI Component Library §9.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-226; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-229"></a>CON-229 | UI Component Library §9.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-226; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-230"></a>CON-230 | UI Component Library §9.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-226; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-231"></a>CON-231 | UI Component Library §10 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-232"></a>CON-232 | UI Component Library §10.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-231; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-233"></a>CON-233 | UI Component Library §10.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-231; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-234"></a>CON-234 | UI Component Library §10.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-231; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-235"></a>CON-235 | UI Component Library §10.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-231; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-236"></a>CON-236 | UI Component Library §10.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-231; F: CON-129; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-237"></a>CON-237 | UI Component Library §10.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-231; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-238"></a>CON-238 | UI Component Library §11 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-239"></a>CON-239 | UI Component Library §11.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-238; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-240"></a>CON-240 | UI Component Library §11.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-238; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-241"></a>CON-241 | UI Component Library §11.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-238; F: CON-036 | clear | — | ACC-006 |
| <a id="con-242"></a>CON-242 | UI Component Library §11.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-238; F: CON-027 | clear | — | ACC-006 |
| <a id="con-243"></a>CON-243 | UI Component Library §11.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-238; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-244"></a>CON-244 | UI Component Library §11.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-238; F: CON-014 | clear | — | ACC-006 |
| <a id="con-245"></a>CON-245 | UI Component Library §12 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-246"></a>CON-246 | UI Component Library §12.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; F: CON-013; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-247"></a>CON-247 | UI Component Library §12.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-248"></a>CON-248 | UI Component Library §12.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-249"></a>CON-249 | UI Component Library §12.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; F: CON-011 | clear | — | ACC-006 |
| <a id="con-250"></a>CON-250 | UI Component Library §12.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; F: CON-026 | clear | — | ACC-006 |
| <a id="con-251"></a>CON-251 | UI Component Library §12.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; F: CON-019; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-252"></a>CON-252 | UI Component Library §12.7 | shared presentation and composition contract | SCOPE-006 | Context: CON-245; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-253"></a>CON-253 | UI Component Library §13 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-254"></a>CON-254 | UI Component Library §13.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-255"></a>CON-255 | UI Component Library §13.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-256"></a>CON-256 | UI Component Library §13.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-257"></a>CON-257 | UI Component Library §13.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-258"></a>CON-258 | UI Component Library §13.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-259"></a>CON-259 | UI Component Library §13.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-260"></a>CON-260 | UI Component Library §13.7 | shared presentation and composition contract | SCOPE-006 | Context: CON-253; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-261"></a>CON-261 | UI Component Library §14 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-262"></a>CON-262 | UI Component Library §14.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-261; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-263"></a>CON-263 | UI Component Library §14.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-261; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-264"></a>CON-264 | UI Component Library §14.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-261; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-265"></a>CON-265 | UI Component Library §14.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-261; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-266"></a>CON-266 | UI Component Library §14.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-261; F: CON-026 | clear | — | ACC-006 |
| <a id="con-267"></a>CON-267 | UI Component Library §15 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-268"></a>CON-268 | UI Component Library §15.1 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; F: CON-022, CON-071; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-269"></a>CON-269 | UI Component Library §15.2 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-270"></a>CON-270 | UI Component Library §15.3 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; F: CON-064; Vocabulary: CON-346 | clear | — | ACC-006 |
| <a id="con-271"></a>CON-271 | UI Component Library §15.4 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-272"></a>CON-272 | UI Component Library §15.5 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-273"></a>CON-273 | UI Component Library §15.6 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-274"></a>CON-274 | UI Component Library §15.7 | shared presentation and composition contract | SCOPE-006 | Context: CON-267; No explicit outbound MCP reference | clear | — | ACC-006 |
| <a id="con-344"></a>CON-344 | UI Component Library §24 | component-layer extension and authoring contract | SCOPE-007 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-010 |
| <a id="con-345"></a>CON-345 | UI Component Library §25 | shared presentation and composition contract | SCOPE-006 | Context: CON-187; F: CON-074, CON-077, CON-080, CON-075, CON-083, CON-082, CON-084, CON-076, CON-078, CON-079, CON-094, CON-088, CON-089, CON-090, CON-087, CON-148, CON-026, CON-035, CON-092, CON-095, CON-093, CON-099, CON-116, CON-100, CON-103, CON-104, CON-105, CON-106, CON-107, CON-108, CON-112, CON-111, CON-113, CON-114, CON-118, CON-124, CON-125, CON-126, CON-120, CON-146, CON-121, CON-122, CON-123, CON-147; C: CON-276, CON-277, CON-278, CON-279, CON-280, CON-281, CON-282, CON-283, CON-284, CON-286, CON-287, CON-288, CON-289, CON-290, CON-292, CON-291, CON-293, CON-294, CON-295, CON-298, CON-299, CON-302, CON-297, CON-301, CON-303, CON-305, CON-304, CON-306, CON-307, CON-309, CON-310, CON-311, CON-312, CON-313, CON-314, CON-316, CON-317, CON-318, CON-319, CON-320, CON-321, CON-322, CON-323, CON-324, CON-325, CON-327, CON-328, CON-329, CON-330, CON-331, CON-332, CON-333, CON-334, CON-336, CON-337, CON-335, CON-338, CON-339, CON-340, CON-341, CON-343; P: CON-214; Live reference audit: ISS-001 | clear | ISS-001 (resolved) | ACC-012 |

## Catalog coverage

Each of the 61 public identities has one row at its canonical catalog section. Family context rows are excluded from that identity count. Foundation and component-layer references below come from the canonical sections, not inferred targets from plain section-number text in an ephemeral rendering. The two map-reference columns for every identity were verified through MCP in ISS-001, and the catalog behavior and inventory reconciliation are complete.

| ID | MCP source | Coverage category | Scope ID | Depends on | Review status | Issue IDs | Acceptance IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="con-275"></a>CON-275 | UI Component Library §16 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-276"></a>CON-276 | UI Component Library §16.1 | catalog control | SCOPE-003 | Context: CON-275; F: CON-074; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-277"></a>CON-277 | UI Component Library §16.2 | catalog control | SCOPE-003 | Context: CON-275; F: CON-077; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-278"></a>CON-278 | UI Component Library §16.3 | catalog control | SCOPE-003 | Context: CON-275; F: CON-080; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-279"></a>CON-279 | UI Component Library §16.4 | catalog control | SCOPE-003 | Context: CON-275; F: CON-075; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-280"></a>CON-280 | UI Component Library §16.5 | catalog control | SCOPE-003 | Context: CON-275; F: CON-083, CON-082; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-281"></a>CON-281 | UI Component Library §16.6 | catalog control | SCOPE-003 | Context: CON-275; F: CON-084; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-282"></a>CON-282 | UI Component Library §16.7 | catalog control | SCOPE-003 | Context: CON-275; F: CON-076; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-283"></a>CON-283 | UI Component Library §16.8 | catalog control | SCOPE-003 | Context: CON-275; F: CON-078; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-284"></a>CON-284 | UI Component Library §16.9 | catalog control | SCOPE-003 | Context: CON-275; F: CON-079; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-285"></a>CON-285 | UI Component Library §17 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-286"></a>CON-286 | UI Component Library §17.1 | catalog control | SCOPE-003 | Context: CON-285; F: CON-094; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-287"></a>CON-287 | UI Component Library §17.2 | catalog control | SCOPE-003 | Context: CON-285; F: CON-088, CON-089; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-288"></a>CON-288 | UI Component Library §17.3 | catalog control | SCOPE-003 | Context: CON-285; F: CON-090; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-289"></a>CON-289 | UI Component Library §17.4 | catalog control | SCOPE-003 | Context: CON-285; F: CON-087; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-290"></a>CON-290 | UI Component Library §17.5 | catalog control | SCOPE-003 | Context: CON-285; F: CON-087, CON-148; C: CON-277; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-291"></a>CON-291 | UI Component Library §17.6 | catalog control | SCOPE-003 | Context: CON-285; F: CON-092; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-292"></a>CON-292 | UI Component Library §17.7 | catalog control | SCOPE-003 | Context: CON-285; F: CON-026, CON-035; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-293"></a>CON-293 | UI Component Library §17.8 | catalog control | SCOPE-003 | Context: CON-285; F: CON-095; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-294"></a>CON-294 | UI Component Library §17.9 | catalog control | SCOPE-003 | Context: CON-285; F: CON-093; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-295"></a>CON-295 | UI Component Library §17.10 | catalog control | SCOPE-003 | Context: CON-285; F: CON-026, CON-035; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-296"></a>CON-296 | UI Component Library §18 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-297"></a>CON-297 | UI Component Library §18.1 | catalog control | SCOPE-003 | Context: CON-296; F: CON-100; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-298"></a>CON-298 | UI Component Library §18.2 | catalog control | SCOPE-003 | Context: CON-296; F: CON-099; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-299"></a>CON-299 | UI Component Library §18.3 | catalog control | SCOPE-003 | Context: CON-296; F: CON-116; C: CON-302; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-300"></a>CON-300 | UI Component Library §19 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-301"></a>CON-301 | UI Component Library §19.1 | catalog control | SCOPE-003 | Context: CON-300; F: CON-103; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-302"></a>CON-302 | UI Component Library §19.2 | catalog control | SCOPE-003 | Context: CON-300; F: CON-104; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-303"></a>CON-303 | UI Component Library §19.3 | catalog control | SCOPE-003 | Context: CON-300; F: CON-105; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-304"></a>CON-304 | UI Component Library §19.4 | catalog control | SCOPE-003 | Context: CON-300; F: CON-107; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-305"></a>CON-305 | UI Component Library §19.5 | catalog control | SCOPE-003 | Context: CON-300; F: CON-106; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-306"></a>CON-306 | UI Component Library §19.6 | catalog control | SCOPE-003 | Context: CON-300; F: CON-104; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-307"></a>CON-307 | UI Component Library §19.7 | catalog control | SCOPE-003 | Context: CON-300; F: CON-108; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-308"></a>CON-308 | UI Component Library §20 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-309"></a>CON-309 | UI Component Library §20.1 | catalog control | SCOPE-003 | Context: CON-308; F: CON-026, CON-148; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-310"></a>CON-310 | UI Component Library §20.2 | catalog control | SCOPE-003 | Context: CON-308; F: CON-112; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-311"></a>CON-311 | UI Component Library §20.3 | catalog control | SCOPE-003 | Context: CON-308; F: CON-111; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-312"></a>CON-312 | UI Component Library §20.4 | catalog control | SCOPE-003 | Context: CON-308; F: CON-113; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-313"></a>CON-313 | UI Component Library §20.5 | catalog control | SCOPE-003 | Context: CON-308; F: CON-114; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-314"></a>CON-314 | UI Component Library §20.6 | catalog control | SCOPE-003 | Context: CON-308; F: CON-026, CON-148; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-315"></a>CON-315 | UI Component Library §21 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-316"></a>CON-316 | UI Component Library §21.1 | catalog control | SCOPE-003 | Context: CON-315; F: CON-118; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-317"></a>CON-317 | UI Component Library §21.2 | catalog control | SCOPE-003 | Context: CON-315; F: CON-124; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-318"></a>CON-318 | UI Component Library §21.3 | catalog control | SCOPE-003 | Context: CON-315; F: CON-125; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-319"></a>CON-319 | UI Component Library §21.4 | catalog control | SCOPE-003 | Context: CON-315; F: CON-126; Shared: CON-190, CON-219 | clear | ISS-001 (resolved), ISS-002 (resolved) | ACC-009 |
| <a id="con-320"></a>CON-320 | UI Component Library §21.5 | catalog control | SCOPE-003 | Context: CON-315; F: CON-120; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-321"></a>CON-321 | UI Component Library §21.6 | catalog control | SCOPE-003 | Context: CON-315; F: CON-146; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-322"></a>CON-322 | UI Component Library §21.7 | catalog control | SCOPE-003 | Context: CON-315; F: CON-121; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-323"></a>CON-323 | UI Component Library §21.8 | catalog control | SCOPE-003 | Context: CON-315; F: CON-122; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-324"></a>CON-324 | UI Component Library §21.9 | catalog control | SCOPE-003 | Context: CON-315; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-325"></a>CON-325 | UI Component Library §21.10 | catalog control | SCOPE-003 | Context: CON-315; F: CON-123; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-326"></a>CON-326 | UI Component Library §22 | catalog family context | SCOPE-003 | Context: CON-187; F: CON-014 | clear | — | ACC-009 |
| <a id="con-327"></a>CON-327 | UI Component Library §22.1 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-328"></a>CON-328 | UI Component Library §22.2 | catalog control | SCOPE-003 | Context: CON-326; P: CON-214; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-329"></a>CON-329 | UI Component Library §22.3 | catalog control | SCOPE-003 | Context: CON-326; F: CON-148; C: CON-277; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-330"></a>CON-330 | UI Component Library §22.4 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-331"></a>CON-331 | UI Component Library §22.5 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-332"></a>CON-332 | UI Component Library §22.6 | catalog control | SCOPE-003 | Context: CON-326; C: CON-277; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-333"></a>CON-333 | UI Component Library §22.7 | catalog control | SCOPE-003 | Context: CON-326; P: CON-214; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-334"></a>CON-334 | UI Component Library §22.8 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-335"></a>CON-335 | UI Component Library §22.9 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026, CON-148; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-336"></a>CON-336 | UI Component Library §22.10 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-337"></a>CON-337 | UI Component Library §22.11 | catalog control | SCOPE-003 | Context: CON-326; F: CON-035, CON-148; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-338"></a>CON-338 | UI Component Library §22.12 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-339"></a>CON-339 | UI Component Library §22.13 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-340"></a>CON-340 | UI Component Library §22.14 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-341"></a>CON-341 | UI Component Library §22.15 | catalog control | SCOPE-003 | Context: CON-326; F: CON-026; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |
| <a id="con-342"></a>CON-342 | UI Component Library §23 | catalog family context | SCOPE-003 | Context: CON-187; No explicit outbound MCP reference | clear | — | ACC-009 |
| <a id="con-343"></a>CON-343 | UI Component Library §23.1 | catalog control | SCOPE-003 | Context: CON-342; F: CON-147; Shared: CON-190, CON-219 | clear | ISS-001 (resolved) | ACC-009 |

## Supporting source inventories

These are references to inventories in the live MCP resources. Informative appendices remain informative; they do not create additional conformance requirements or permission to inspect external sources. Excluded and retired entries are retained as source dispositions, not new implementation requirements.

| ID | MCP source | Coverage category | Scope ID | Depends on | Review status | Issue IDs | Acceptance IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="con-155"></a>CON-155 | UI Foundation §21 | supporting source inventory | SCOPE-014 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-156"></a>CON-156 | UI Foundation §21.1 | supporting source inventory | SCOPE-014 | Context: CON-155; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-157"></a>CON-157 | UI Foundation §21.2 | supporting source inventory | SCOPE-014 | Context: CON-155; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-158"></a>CON-158 | UI Foundation §21.3 | supporting source inventory | SCOPE-014 | Context: CON-155; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-159"></a>CON-159 | UI Foundation §22 | supporting source inventory | SCOPE-014 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-160"></a>CON-160 | UI Foundation §22.1 | supporting source inventory | SCOPE-014 | Context: CON-159; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-161"></a>CON-161 | UI Foundation §22.2 | supporting source inventory | SCOPE-014 | Context: CON-159; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-162"></a>CON-162 | UI Foundation §22.3 | supporting source inventory | SCOPE-014 | Context: CON-159; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-163"></a>CON-163 | UI Foundation §22.4 | supporting source inventory | SCOPE-014 | Context: CON-159; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-164"></a>CON-164 | UI Foundation §22.5 | supporting source inventory | SCOPE-014 | Context: CON-159; I: CON-170; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-165"></a>CON-165 | UI Foundation §22.6 | supporting source inventory | SCOPE-014 | Context: CON-159; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-166"></a>CON-166 | UI Foundation §22.6.1 | supporting source inventory | SCOPE-014 | Context: CON-165; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-167"></a>CON-167 | UI Foundation §22.6.2 | supporting source inventory | SCOPE-014 | Context: CON-165; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-168"></a>CON-168 | UI Foundation §22.6.3 | supporting source inventory | SCOPE-014 | Context: CON-165; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-169"></a>CON-169 | UI Foundation §22.6.4 | supporting source inventory | SCOPE-014 | Context: CON-165; I: CON-173, CON-164, CON-170; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-170"></a>CON-170 | UI Foundation §22.7 | supporting source inventory | SCOPE-014 | Context: CON-159; I: CON-164; Vocabulary: CON-346 | clear | ISS-002 (resolved) | ACC-003 |
| <a id="con-171"></a>CON-171 | UI Foundation §22.7.1 | supporting source inventory | SCOPE-014 | Context: CON-170; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-172"></a>CON-172 | UI Foundation §22.7.2 | supporting source inventory | SCOPE-014 | Context: CON-170; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-173"></a>CON-173 | UI Foundation §22.8 | supporting source inventory | SCOPE-014 | Context: CON-159; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-174"></a>CON-174 | UI Foundation §22.8.1 | supporting source inventory | SCOPE-014 | Context: CON-173; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-175"></a>CON-175 | UI Foundation §22.8.2 | supporting source inventory | SCOPE-014 | Context: CON-173; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-176"></a>CON-176 | UI Foundation §22.8.3 | supporting source inventory | SCOPE-014 | Context: CON-173; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-177"></a>CON-177 | UI Foundation §22.9 | supporting source inventory | SCOPE-014 | Context: CON-159; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-178"></a>CON-178 | UI Foundation §23 | supporting source inventory | SCOPE-014 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-179"></a>CON-179 | UI Foundation §24 | supporting source inventory | SCOPE-014 | Context: CON-001; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-180"></a>CON-180 | UI Foundation §24.1 | supporting source inventory | SCOPE-014 | Context: CON-179; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-181"></a>CON-181 | UI Foundation §24.2 | supporting source inventory | SCOPE-014 | Context: CON-179; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-182"></a>CON-182 | UI Foundation §24.3 | supporting source inventory | SCOPE-014 | Context: CON-179; F: CON-014, CON-010, CON-013, CON-068; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-183"></a>CON-183 | UI Foundation §25 | supporting source inventory | SCOPE-014 | Context: CON-001; F: CON-004, CON-149, CON-002; I: CON-165, CON-170, CON-173, CON-184, CON-178; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-184"></a>CON-184 | UI Foundation §26 | supporting source inventory | SCOPE-014 | Context: CON-001; F: CON-002, CON-149 | clear | — | ACC-003 |
| <a id="con-185"></a>CON-185 | UI Foundation §26.1 | supporting source inventory | SCOPE-014 | Context: CON-184; No explicit outbound MCP reference | clear | — | ACC-003 |
| <a id="con-186"></a>CON-186 | UI Foundation §26.2 | supporting source inventory | SCOPE-014 | Context: CON-184; Vocabulary: CON-346 | clear | — | ACC-003 |
| <a id="con-346"></a>CON-346 | Managed vocabulary — `managed:glossary` | supporting source inventory | SCOPE-014 | Shared vocabulary; relationships between definitions remain in the source | clear | — | ACC-001 |

## Coverage reconciliation

<a id="coverage-reconciliation"></a>
The following indexing and readiness checks ran on 2026-09-15. They establish the Phase 1 planning baseline and do not claim implementation conformance.

| Check | Observed result | Evidence and limit |
| --- | --- | --- |
| MCP source-node uniqueness | 388 explicit anchors, no duplicates | Both complete document ASTs and `managed:glossary`; heading records plus managed term anchors. |
| Existing internal MCP references | No unresolved targets | Direct MCP inspection confirmed that the questioned table references already exist; their plain snapshot rendering was a false positive. See ISS-001. |
| Foundation evidence inventory | pass — 38 rows and 38 unique identities | CON-158; the informative inventory is reconciled as evidence and is not treated as a ceiling on Foundation capabilities or catalog controls. |
| Component coverage map | 61 rows and 61 unique identities | CON-345; the live AST contains 61 catalog-reference nodes and 73 behavioral-authority reference nodes, with valid targets in all 61 rows. |
| Catalog identity reconciliation | pass — exact set equality: 61 map identities and 61 canonical definition-summary identities; no duplicates | The 61 canonical rows above, CON-219, and CON-345. |
| Catalog definition-kind reconciliation | pass — each canonical summary kind matches its coverage-map kind and behavior | Canonical rows above and CON-345. |
| Canonical table presence | pass — each of 61 catalog sections has exactly one Public definition, Definition summary, and Public definition detail table | CON-219; table contents and owning contracts were audited. |
| Foundation-only optional catalog boundary | NumberField and Meter included at Foundation level; no additional catalog identities | CON-154, SCOPE-005. |
| Composition-only catalog boundary | pass — Radio, Autocomplete, and Toolbar are complete through catalog compositions and are not additional catalog identities | CON-154 and SCOPE-004. |
| Exclusions | Four Appendix F features, UI Foundation §19.10 compatibility, and UI Reactive Panel are recorded | Scope dispositions; required parent contracts remain indexed. |
| Requested table-reference reconciliation | pass | ISS-001: 13 references in UI Component Library §1.1 and 134 in UI Component Library §25 exist in the live AST; all targets resolve and all coverage authorities are anchored by their canonical control sections. |
| Complete dependency reconciliation | pass | All explicit CON dependencies resolve; every source section and inventory unit was reviewed in Foundation, presentation, then catalog order. |
| Readiness review and acceptance coverage | pass | Every CON record is clear; every included record has a primary ACC mapping, while excluded CON-140 is explicitly not applicable. Cross-cutting accessibility, positioning, state, motion, Storybook, conformance, and build evidence are separately assigned. |

### Section-row totals (not capability totals)

| Index group | Rows | Interpretation |
| --- | --- | --- |
| Foundation | 154 | Includes hierarchy context, verification, and one explicitly excluded compatibility contract. |
| Shared presentation and composition | 90 | Includes hierarchy context, authoring, and verification. |
| Catalog | 69 | 61 identities plus 8 family context headings. |
| Supporting inventories | 33 | Informative source sections and the shared terms section; not additional public controls. |
| Total | 346 | Stable CON records; no record is a completed implementation task. |

The contract index is complete for source version 0.2.62 and is ready for the Phase 2 architecture handoff. Reopen affected records if the authoritative source version changes.
