import { useState, type FormEvent } from "react";
import { useAppData } from "../context/DataContext";
import type { Profile } from "../types";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";

export function FriendsPage() {
  const {
    clips,
    acceptedFriends,
    acceptedFriendRecords,
    incomingRequests,
    outgoingRequests,
    searchProfiles,
    sendFriendRequest,
    answerFriendRequest,
    removeFriend
  } = useAppData();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!term.trim()) return;
    setBusyId("search");
    setError("");
    setMessage("");
    try {
      setResults(await searchProfiles(term));
      setSearched(true);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "搜索失败");
    } finally {
      setBusyId("");
    }
  }

  async function addFriend(profile: Profile) {
    setBusyId(profile.id);
    setError("");
    setMessage("");
    try {
      await sendFriendRequest(profile.id);
      setMessage(`已向 ${profile.display_name} 发送好友申请。`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "申请发送失败");
    } finally {
      setBusyId("");
    }
  }

  async function answer(id: string, accept: boolean) {
    const friendship = incomingRequests.find((item) => item.id === id);
    if (!friendship) return;
    setBusyId(id);
    try {
      await answerFriendRequest(friendship, accept);
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "处理申请失败");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="friends-page">
      <div className="friends-main">
        <section className="friend-search panel panel-cut">
          <div className="panel-heading">
            <div>
              <h2>找到你的队友</h2>
              <p>通过用户名、显示名称或 Riot ID 搜索。</p>
            </div>
          </div>
          <form className="friend-search-form" onSubmit={search}>
            <div className="search-input">
              <Icon name="search" />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="例如 nightshift 或 NightShift#0824"
              />
            </div>
            <button className="button button-primary" disabled={busyId === "search" || !term.trim()}>
              {busyId === "search" ? "搜索中…" : "搜索玩家"}
            </button>
          </form>

          {error && <div className="form-message form-error">{error}</div>}
          {message && <div className="form-message form-success">{message}</div>}

          {searched && (
            <div className="search-results">
              {results.length ? results.map((profile) => (
                <div className="player-result" key={profile.id}>
                  <Avatar profile={profile} size="md" />
                  <div>
                    <strong>{profile.display_name}</strong>
                    <span>@{profile.username} · {profile.riot_id || "未填写 Riot ID"}</span>
                  </div>
                  <button className="button button-ghost" onClick={() => void addFriend(profile)} disabled={busyId === profile.id}>
                    <Icon name="plus" size={16} /> {busyId === profile.id ? "发送中" : "加好友"}
                  </button>
                </div>
              )) : (
                <p className="empty-copy">没有找到匹配的玩家，换个关键词试试。</p>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="section-heading">
            <div>
              <h2>我的好友</h2>
              <p>好友发布的“仅好友”集锦会出现在你的动态里。</p>
            </div>
            <span className="section-count">{acceptedFriends.length} 位队友</span>
          </div>

          {acceptedFriends.length ? (
            <div className="friend-grid">
              {acceptedFriends.map((profile) => {
                const record = acceptedFriendRecords.find(
                  (item) => item.requester_id === profile.id || item.addressee_id === profile.id
                );
                const friendClipCount = clips.filter((clip) => clip.user_id === profile.id).length;
                return (
                  <article className="friend-card" key={profile.id}>
                    <div className="friend-card-top">
                      <Avatar profile={profile} size="lg" />
                      <button
                        className="icon-button"
                        aria-label="移除好友"
                        title="移除好友"
                        onClick={() => record && void removeFriend(record)}
                      >
                        <Icon name="more" />
                      </button>
                    </div>
                    <h3>{profile.display_name}</h3>
                    <p>@{profile.username}</p>
                    <span>{profile.riot_id || "Riot ID 未填写"}</span>
                    <div className="friend-card-foot">
                      <strong>{friendClipCount}</strong>
                      <small>条可见集锦</small>
                      <Icon name="chevron" size={17} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-panel">
              <Icon name="users" size={28} />
              <strong>好友列表还是空的</strong>
              <p>搜索用户名，邀请第一位队友。</p>
            </div>
          )}
        </section>
      </div>

      <aside className="friends-side">
        <section className="panel">
          <div className="panel-heading compact-heading">
            <div>
              <h2>好友申请</h2>
              <p>{incomingRequests.length ? `${incomingRequests.length} 条待处理` : "暂时没有新申请"}</p>
            </div>
          </div>
          <div className="request-list">
            {incomingRequests.map((request) => (
              <div className="friend-request" key={request.id}>
                <Avatar profile={request.requester} size="md" />
                <div>
                  <strong>{request.requester?.display_name}</strong>
                  <span>@{request.requester?.username}</span>
                </div>
                <div className="request-actions">
                  <button onClick={() => void answer(request.id, true)} disabled={busyId === request.id} aria-label="接受">
                    <Icon name="check" size={16} />
                  </button>
                  <button onClick={() => void answer(request.id, false)} disabled={busyId === request.id} aria-label="拒绝">
                    <Icon name="x" size={16} />
                  </button>
                </div>
              </div>
            ))}
            {!incomingRequests.length && (
              <div className="empty-panel compact">
                <Icon name="bell" />
                <p>有新的好友申请时会出现在这里。</p>
              </div>
            )}
          </div>
        </section>

        {outgoingRequests.length > 0 && (
          <section className="panel">
            <div className="panel-heading compact-heading">
              <div>
                <h2>等待回应</h2>
                <p>已发送的申请。</p>
              </div>
            </div>
            <div className="request-list">
              {outgoingRequests.map((request) => (
                <div className="friend-request" key={request.id}>
                  <Avatar profile={request.addressee} size="sm" />
                  <div>
                    <strong>{request.addressee?.display_name}</strong>
                    <span>等待对方接受</span>
                  </div>
                  <button className="text-button" onClick={() => void removeFriend(request)}>撤回</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="tips-panel">
          <Icon name="shield" />
          <h3>权限由数据库控制</h3>
          <p>“仅好友”视频只会向成为好友的账号签发临时播放地址，不能绕过客户端直接访问。</p>
        </section>
      </aside>
    </div>
  );
}
