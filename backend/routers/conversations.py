from fastapi import APIRouter

from database import (
    save_message,
    get_conversations,
    get_messages,
    create_conversation,
    delete_conversation,
    rename_conversation,
)

router = APIRouter()


@router.get("/api/conversations")
def list_conversations():
    return get_conversations()


@router.post("/api/conversations")
def new_conversation(body: dict):
    title = body.get("title", "New Chat")
    cid = create_conversation(title)
    return {"id": cid, "title": title}


@router.delete("/api/conversations/{cid}")
def remove_conversation(cid: str):
    delete_conversation(cid)
    return {"ok": True}


@router.patch("/api/conversations/{cid}")
def update_conversation_title(cid: str, body: dict):
    rename_conversation(cid, body.get("title", "Chat"))
    return {"ok": True}


@router.get("/api/conversations/{cid}/messages")
def list_messages(cid: str):
    return get_messages(cid)