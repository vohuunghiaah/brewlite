"""Render the overview with PlantUML, centered and scaled to the SVG viewport.

Requires Java 9+ (Java 17 recommended).
Install: python -m pip install JPype1
Run: python scripts/render-use-case-overview.py --jar /path/to/plantuml.jar
Optional --jvm points to jvm.dll when Java is not discoverable.
"""
from pathlib import Path
import argparse
import xml.etree.ElementTree as ET
import jpype

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--jar", type=Path, required=True)
parser.add_argument("--jvm")
args = parser.parse_args()
jpype.startJVM(args.jvm or jpype.getDefaultJVMPath(), classpath=[str(args.jar.resolve())])
try:
    root = Path(__file__).resolve().parents[1]
    source = root / "docs/requirements/use-case-overview.puml"
    reader = jpype.JClass("net.sourceforge.plantuml.SourceStringReader")(source.read_text(encoding="utf-8"))
    options = jpype.JClass("net.sourceforge.plantuml.FileFormatOption")(
        jpype.JClass("net.sourceforge.plantuml.FileFormat").SVG
    ).withPreserveAspectRatio("xMidYMid meet")
    buffer = jpype.JClass("java.io.ByteArrayOutputStream")()
    result = reader.outputImage(buffer, options)
    if result is None or "error" in str(result.getDescription()).lower():
        raise RuntimeError("PlantUML could not render the overview")
    data = bytes(buffer.toByteArray())
    svg = ET.fromstring(data)
    assert svg.attrib["preserveAspectRatio"] == "xMidYMid meet"
    assert "viewBox" in svg.attrib and "width" not in svg.attrib and "height" not in svg.attrib
    source.with_suffix(".svg").write_bytes(data)
    print("Rendered", source.with_suffix(".svg"))
finally:
    jpype.shutdownJVM()
