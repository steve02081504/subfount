/**
 * 创建 run_code 消息处理器，仅响应来自指定主机的消息。
 * @param {object} root0 依赖对象
 * @param {object} root0.host 主机辅助对象
 * @param {object} root0.actions 消息动作集合
 * @param {Function} root0.sendDeviceInfoToHost 向主机上报设备信息的函数
 * @returns {Function} run_code 消息处理函数
 */
export function createRunCodeHandler({ host, actions, sendDeviceInfoToHost }) {
	return async function handleRunCode(message, peerId) {
		if (peerId !== host.hostNodeHash) return

		const { payload, requestId } = message
		const { script, callbackInfo } = payload

		await sendDeviceInfoToHost()

		try {
			const { async_eval } = await import('npm:@steve02081504/async-eval')

			let callback = null
			if (callbackInfo && actions.sendCallback)
				/**
				 * 把执行中的回调数据发送给主机。
				 * @param {*} data 回调数据
				 */
				callback = async (data) => {
					await actions.sendCallback({
						partpath: callbackInfo.partpath,
						data,
					}, host.hostNodeHash)
				}

			const evalResult = await async_eval(script, { callback })

			await actions.sendResponse({
				requestId,
				payload: evalResult,
			}, host.hostNodeHash)

			await sendDeviceInfoToHost()
		}
		catch (error) {
			await actions.sendResponse({
				requestId,
				payload: { error: error.message, stack: error.stack },
				isError: true,
			}, host.hostNodeHash)
		}
	}
}

/**
 * 创建 shell_exec 消息处理器，仅响应来自指定主机的消息。
 * @param {object} root0 依赖对象
 * @param {object} root0.host 主机辅助对象
 * @param {object} root0.actions 消息动作集合
 * @returns {Function} shell_exec 消息处理函数
 */
export function createShellExecHandler({ host, actions }) {
	return async function handleShellExec(message, peerId) {
		if (peerId !== host.hostNodeHash) return

		const { payload, requestId } = message
		const { command, shell, options } = payload

		try {
			const { exec: run, shell_exec_map } = await import('npm:@steve02081504/exec')

			if (shell) {
				if (!shell_exec_map[shell])
					throw new Error(`Unsupported shell: ${shell}`)
				const result = await shell_exec_map[shell](command, options || {})
				await actions.sendResponse({
					requestId,
					payload: result,
				}, host.hostNodeHash)
				return
			}

			const result = await run(command, options || {})
			await actions.sendResponse({
				requestId,
				payload: result,
			}, host.hostNodeHash)
		}
		catch (error) {
			await actions.sendResponse({
				requestId,
				payload: { error: error.message, stack: error.stack },
				isError: true,
			}, host.hostNodeHash)
		}
	}
}
