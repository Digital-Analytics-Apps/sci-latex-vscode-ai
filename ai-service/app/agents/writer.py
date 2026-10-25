from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from app.core.llm import get_llm

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Você é o redator científico especializado em LaTeX da plataforma SCIA. "
            "Sua missão é redigir, aprimorar e estruturar seções acadêmicas rigorosas, formais e bem fundamentadas. "
            "O conteúdo atual do documento é fornecido delimitado pelas tags <document_content>. "
            "Utilize sempre sintaxe LaTeX válida para fórmulas, tabelas e comandos \\cite{} de referências.",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        (
            "user",
            "<document_content>\n{document_content}\n</document_content>\n\nSolicitação:\n{input}",
        ),
    ]
)

writer_agent = prompt | get_llm() | StrOutputParser()
