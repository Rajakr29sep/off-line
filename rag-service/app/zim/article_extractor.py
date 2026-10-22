from bs4 import BeautifulSoup
import re

def extract_article_text(html_text: str) -> tuple[str, str]:
    soup = BeautifulSoup(html_text, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else "Untitled article"
    for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        element.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()
    return title, text
