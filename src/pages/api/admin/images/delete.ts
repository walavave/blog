import type { APIRoute } from 'astro';
import {
  ADMIN_JSON_HEADERS,
  createAdminJsonErrorResponse,
  createAdminWriteQueue,
  readAdminJsonRequestBody,
  validateAdminJsonWriteRequest
} from '../../../../lib/admin-console/admin-api';
import {
  AdminImageError,
  moveAdminImageToTrash
} from '../../../../lib/admin-console/image-shared';

const DEV_ONLY_NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });
const METHOD_NOT_ALLOWED_RESPONSE = new Response('Method Not Allowed', {
  status: 405,
  headers: {
    allow: 'POST',
    'cache-control': 'no-store'
  }
});

const withAdminImageDeleteLock = createAdminWriteQueue();

const createJsonResponse = (status: number, payload: unknown): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: ADMIN_JSON_HEADERS
  });

const getRequestedPath = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    throw new AdminImageError('删除请求缺少 path');
  }

  const pathValue = Reflect.get(body, 'path');
  return typeof pathValue === 'string' ? pathValue.trim() : '';
};

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV && !process.env.VITEST) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  return METHOD_NOT_ALLOWED_RESPONSE.clone();
};

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV && !process.env.VITEST) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  const requestError = validateAdminJsonWriteRequest(request, url, 'Admin Images delete', '删除');
  if (requestError) {
    return createAdminJsonErrorResponse(requestError.status, [requestError.error]);
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: '删除请求缺少 JSON 请求体',
    parseTrimmedBody: true
  });
  if (!bodyResult.ok) {
    return createAdminJsonErrorResponse(bodyResult.status, [bodyResult.error]);
  }

  let assetPath = '';
  try {
    assetPath = getRequestedPath(bodyResult.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除请求缺少 path';
    return createAdminJsonErrorResponse(400, [message]);
  }

  if (!assetPath) {
    return createAdminJsonErrorResponse(400, ['删除请求缺少 path']);
  }

  return withAdminImageDeleteLock(async () => {
    try {
      const result = await moveAdminImageToTrash(assetPath);
      return createJsonResponse(200, {
        ok: true,
        result
      });
    } catch (error) {
      if (error instanceof AdminImageError) {
        return createAdminJsonErrorResponse(error.status, [error.message]);
      }

      console.error('[astro-whono] Failed to delete admin image:', error);
      return createAdminJsonErrorResponse(500, ['删除图片失败，请检查本地文件权限或日志']);
    }
  });
};
