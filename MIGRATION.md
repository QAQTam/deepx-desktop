# DeepX Desktop migration gate

`deepx-desktop` is the independent Electron client for the v0.9 daemon architecture.
The legacy Tauri shell remains only as a temporary parity reference and must not gain
new backend business logic.

The Tauri crate can be removed from the DeepX workspace after these gates pass:

- daemon discovery, launch, authentication, reconnect, resume, and session leases;
- session list/history, streaming output, tools, permissions, Ask, Plan, Skills,
  Goal/Task, Git, settings, statistics, cancel, compact, and message rollback;
- native folder selection, external links, notifications, and window behavior;
- Windows packaging includes `deepx-daemon.exe` without console windows or coupling
  daemon lifetime to the desktop process;
- Windows end-to-end and reconnect soak tests pass, and Linux packaging is visually
  accepted;
- no renderer import or IPC method references the old Tauri command surface.

Once the gates pass, remove `deepx-tauri`, its command registration, and its bundled
frontend from `D:\DeepX` in one commit. Storage and protocol compatibility remain
owned by `deepx-daemon`; they are not part of the shell removal.
