def load_syllabus(path: str, max_pages: int = 30) -> str:
    if path.endswith(".pdf"):
        text = ""
        try:
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                pages = pdf.pages[:max_pages]
                for page in pages:
                    text += page.extract_text() or ""
            return text
        except Exception:
            import PyPDF2
            with open(path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                pages = reader.pages[:max_pages]
                for page in pages:
                    text += page.extract_text() or ""
            return text
    elif path.endswith(".txt"):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        raise ValueError("Only .pdf or .txt supported")