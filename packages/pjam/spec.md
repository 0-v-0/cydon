# Cydon-RPC协议规范

## 目录
- [Cydon-RPC协议规范](#cydon-rpc协议规范)
  - [目录](#目录)
  - [简介](#简介)
  - [特点](#特点)
  - [规范](#规范)
    - [请求消息格式](#请求消息格式)
    - [响应消息格式](#响应消息格式)
    - [异步调用模式](#异步调用模式)
  - [参考](#参考)

## 简介
Cydon-RPC是一个高性能的远程过程调用(RPC)协议

## 特点
1. 简单：不像gRPC那样需要编写proto文件，也不需要像RESTful那样遵循繁杂的规范
2. 紧凑：传输时将数据序列化为二进制编码，与文本格式相比大幅减少了传输数据量，从而提高传输效率
3. 快速：采用流式反序列化+零拷贝的设计，专为现代CPU优化；此外，使用异步调用模式还能有效减少阻塞的发生

## 规范
本协议由请求消息和响应消息组成，并没有严格的客户端和服务端之分，一个节点可以既是客户端也是服务端，因此这里规定：在一次请求中，发出请求的称为客户端，响应请求的称为服务端

### 请求消息格式
请求消息包含以下内容，将依次编码成MessagePack格式
```
msgid, method, params...
```
| 名称   | 类型   | 说明                       |
| ------ | ------ | -------------------------- |
| msgid  | uint   | 请求id，该值每次请求后递增 |
| method | string | 方法名称，可包含任意字符   |
| params | -      | 参数                       |

### 响应消息格式
响应消息包含以下内容，将依次编码成MessagePack格式
```
msgid, error, result...
```
| 名称   | 类型   | 说明                               |
| ------ | ------ | ---------------------------------- |
| msgid  | uint   | 请求id                             |
| error  | object | 为null表示无错误                   |
| result | -      | 结果，若发生错误则该字段可能不存在 |

### 异步调用模式
客户端可一次发送多个请求，这些请求的响应顺序是任意的

## 参考
- [MessagePack](https://msgpack.org/)
- [MessagePack-RPC Specification](https://github.com/mbr0wn/msgpack-rpc/blob/spec-fixes/spec.md)