import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { Camera, Layout, LayoutAnnotation, LayoutDevice, TsdConfig, TsdUnit } from '../shared/types/system-config';

type DeviceFormState = {
  refType: 'TSD_UNIT' | 'CAMERA';
  refId: string;
  posX: string;
  posY: string;
  iconLabel: string;
};

type AnnotationFormState = {
  id: string | null;
  text: string;
  posX: string;
  posY: string;
};

const defaultDeviceFormState: DeviceFormState = {
  refType: 'TSD_UNIT',
  refId: '',
  posX: '0.5',
  posY: '0.5',
  iconLabel: '',
};

const defaultAnnotationFormState: AnnotationFormState = {
  id: null,
  text: '',
  posX: '0.5',
  posY: '0.5',
};

export function LayoutMapPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [layout, setLayout] = useState<Layout | null>(null);
  const [devices, setDevices] = useState<LayoutDevice[]>([]);
  const [annotations, setAnnotations] = useState<LayoutAnnotation[]>([]);
  const [availableUnits, setAvailableUnits] = useState<TsdUnit[]>([]);
  const [availableCameras, setAvailableCameras] = useState<Camera[]>([]);
  const [deviceForm, setDeviceForm] = useState<DeviceFormState>(defaultDeviceFormState);
  const [annotationForm, setAnnotationForm] = useState<AnnotationFormState>(defaultAnnotationFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadData();
  }, [token]);

  async function loadData() {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cameraResponse = await systemConfigApi.listCameras(token);
      setAvailableCameras(cameraResponse.items);

      let config: TsdConfig | null = null;
      try {
        config = await systemConfigApi.getTsdConfig(token);
      } catch (apiError) {
        if (!(apiError instanceof ApiClientError) || apiError.code !== 'CONFIG_NOT_FOUND') {
          throw apiError;
        }
      }

      if (config) {
        const unitsResponse = await systemConfigApi.listUnits(config.id, token);
        setAvailableUnits(unitsResponse.items);
      } else {
        setAvailableUnits([]);
      }

      try {
        const layoutResponse = await systemConfigApi.getLayout(token);
        setLayout(layoutResponse);
        const [deviceResponse, annotationResponse] = await Promise.all([
          systemConfigApi.listLayoutDevices(token),
          systemConfigApi.listAnnotations(token),
        ]);
        setDevices(deviceResponse.items);
        setAnnotations(annotationResponse.items);
      } catch (apiError) {
        if (apiError instanceof ApiClientError && apiError.code === 'LAYOUT_NOT_CONFIGURED') {
          setLayout(null);
          setDevices([]);
          setAnnotations([]);
        } else {
          throw apiError;
        }
      }
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load layout configuration');
    } finally {
      setLoading(false);
    }
  }

  const availableRefs =
    deviceForm.refType === 'TSD_UNIT'
      ? availableUnits.map((unit) => ({
          id: unit.id,
          label: `${unit.externalUnitId}${unit.unitName ? ` - ${unit.unitName}` : ''}`,
        }))
      : availableCameras.map((camera) => ({
          id: camera.id,
          label: camera.name,
        }));

  async function handleUpload() {
    if (!token || !selectedFile) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await systemConfigApi.uploadLayout(selectedFile, token);
      setSelectedFile(null);
      await loadData();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to upload layout');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !layout) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await systemConfigApi.saveLayoutDevices(
        {
          devices: [
            ...devices
              .filter((device) => !(device.refType === deviceForm.refType && device.refId === deviceForm.refId))
              .map((device) => ({
                refType: device.refType,
                refId: device.refId,
                posX: device.posX,
                posY: device.posY,
                iconLabel: device.iconLabel ?? undefined,
              })),
            {
              refType: deviceForm.refType,
              refId: deviceForm.refId,
              posX: Number(deviceForm.posX),
              posY: Number(deviceForm.posY),
              iconLabel: deviceForm.iconLabel.trim() || undefined,
            },
          ],
        },
        token,
      );
      setDeviceForm(defaultDeviceFormState);
      await loadData();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to save device positions');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !layout) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        text: annotationForm.text.trim(),
        posX: Number(annotationForm.posX),
        posY: Number(annotationForm.posY),
      };
      if (annotationForm.id) {
        await systemConfigApi.updateAnnotation(annotationForm.id, payload, token);
      } else {
        await systemConfigApi.createAnnotation(payload, token);
      }
      setAnnotationForm(defaultAnnotationFormState);
      await loadData();
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to save annotation');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="card">Loading layout and map configuration...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>Layout &amp; Map</h2>
          <p className="subtle-text">Upload a room layout, then place devices and annotations using normalized coordinates.</p>
        </div>
        {isAdmin ? <span className="read-only-tag">Editable</span> : <span className="read-only-tag">Read only</span>}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="info-grid">
        <article className="card info-card">
          <div className="card-heading">
            <h3>Layout File</h3>
            {layout ? <span>{layout.fileType}</span> : null}
          </div>
          {layout ? (
            <>
              <p className="subtle-text">{layout.fileName}</p>
              <p className="subtle-text">
                Render size: {layout.width ?? 'N/A'} x {layout.height ?? 'N/A'}
              </p>
            </>
          ) : (
            <p className="subtle-text">No layout uploaded yet.</p>
          )}
          {isAdmin ? (
            <div className="upload-row">
              <input
                accept=".pdf,.jpg,.jpeg"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <button className="button button-secondary" disabled={!selectedFile || saving} onClick={handleUpload} type="button">
                {saving ? 'Uploading...' : layout ? 'Replace Layout' : 'Upload Layout'}
              </button>
            </div>
          ) : null}
        </article>

        <article className="card info-card">
          <div className="card-heading">
            <h3>Placed Devices</h3>
            <span>{devices.length}</span>
          </div>
          {devices.length === 0 ? (
            <p className="subtle-text">No positioned devices yet.</p>
          ) : (
            <ul className="stack-list">
              {devices.map((device) => (
                <li key={device.id} className="list-card">
                  <strong>{device.refType}</strong>
                  <p className="subtle-text">
                    {device.refId} at ({device.posX}, {device.posY})
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <div className="info-grid">
        <article className="card info-card">
          <div className="card-heading">
            <h3>Annotations</h3>
            <span>{annotations.length}</span>
          </div>
          {annotations.length === 0 ? <p className="subtle-text">No annotations yet.</p> : null}
          <ul className="stack-list">
            {annotations.map((annotation) => (
              <li key={annotation.id} className="list-card">
                <div className="card-heading">
                  <strong>{annotation.text}</strong>
                  {isAdmin ? (
                    <button
                      className="button button-secondary button-compact"
                      onClick={() =>
                        setAnnotationForm({
                          id: annotation.id,
                          text: annotation.text,
                          posX: String(annotation.posX),
                          posY: String(annotation.posY),
                        })
                      }
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <p className="subtle-text">
                  ({annotation.posX}, {annotation.posY})
                </p>
              </li>
            ))}
          </ul>
        </article>

        {isAdmin ? (
          <>
            <article className="card">
              <h3>Place Device</h3>
              {!layout ? (
                <p className="subtle-text">Upload a layout before saving device positions.</p>
              ) : (
                <form className="form-grid compact-form" onSubmit={handleSaveDevice}>
                  <label className="field">
                    <span>Reference Type</span>
                    <select
                      onChange={(event) =>
                        setDeviceForm((value) => ({
                          ...value,
                          refType: event.target.value as 'TSD_UNIT' | 'CAMERA',
                          refId: '',
                        }))
                      }
                      value={deviceForm.refType}
                    >
                      <option value="TSD_UNIT">TSD Unit</option>
                      <option value="CAMERA">Camera</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Reference</span>
                    <select
                      onChange={(event) => setDeviceForm((value) => ({ ...value, refId: event.target.value }))}
                      value={deviceForm.refId}
                    >
                      <option value="">Select</option>
                      {availableRefs.map((ref) => (
                        <option key={ref.id} value={ref.id}>
                          {ref.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Position X</span>
                    <input onChange={(event) => setDeviceForm((value) => ({ ...value, posX: event.target.value }))} value={deviceForm.posX} />
                  </label>
                  <label className="field">
                    <span>Position Y</span>
                    <input onChange={(event) => setDeviceForm((value) => ({ ...value, posY: event.target.value }))} value={deviceForm.posY} />
                  </label>
                  <label className="field">
                    <span>Label</span>
                    <input onChange={(event) => setDeviceForm((value) => ({ ...value, iconLabel: event.target.value }))} value={deviceForm.iconLabel} />
                  </label>
                  <div className="form-actions">
                    <button className="button button-secondary" disabled={saving} type="submit">
                      Save Positions
                    </button>
                  </div>
                </form>
              )}
            </article>

            <article className="card">
              <h3>{annotationForm.id ? 'Update Annotation' : 'Add Annotation'}</h3>
              {!layout ? (
                <p className="subtle-text">Upload a layout before adding annotations.</p>
              ) : (
                <form className="form-grid compact-form" onSubmit={handleSaveAnnotation}>
                  <label className="field">
                    <span>Text</span>
                    <textarea
                      onChange={(event) => setAnnotationForm((value) => ({ ...value, text: event.target.value }))}
                      value={annotationForm.text}
                    />
                  </label>
                  <label className="field">
                    <span>Position X</span>
                    <input onChange={(event) => setAnnotationForm((value) => ({ ...value, posX: event.target.value }))} value={annotationForm.posX} />
                  </label>
                  <label className="field">
                    <span>Position Y</span>
                    <input onChange={(event) => setAnnotationForm((value) => ({ ...value, posY: event.target.value }))} value={annotationForm.posY} />
                  </label>
                  <div className="form-actions">
                    <button className="button button-secondary" disabled={saving} type="submit">
                      {annotationForm.id ? 'Update Annotation' : 'Save Annotation'}
                    </button>
                  </div>
                </form>
              )}
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}
